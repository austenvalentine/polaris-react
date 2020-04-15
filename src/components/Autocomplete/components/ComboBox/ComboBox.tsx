import React, {useState, useEffect, useCallback} from 'react';

import {useUniqueId} from '../../../../utilities/unique-id';
import {useToggle} from '../../../../utilities/use-toggle';
import {OptionList, OptionDescriptor} from '../../../OptionList';
import {ActionList} from '../../../ActionList';
import {Popover, PopoverProps} from '../../../Popover';
import {ActionListItemDescriptor, Key} from '../../../../types';
import {KeypressListener} from '../../../KeypressListener';
import {EventListener} from '../../../EventListener';

import {ComboBoxContext} from './context';
import styles from './ComboBox.scss';

export interface ComboBoxProps {
  /** A unique identifier for the ComboBox */
  id?: string;
  /** Collection of options to be listed */
  options: OptionDescriptor[];
  /** The selected options */
  selected: string[];
  /** The text field component attached to the list of options */
  textField: React.ReactElement;
  /** The preferred direction to open the popover */
  preferredPosition?: PopoverProps['preferredPosition'];
  /** Title of the list of options */
  listTitle?: string;
  /** Allow more than one option to be selected */
  allowMultiple?: boolean;
  /** Actions to be displayed before the list of options */
  actionsBefore?: ActionListItemDescriptor[];
  /** Actions to be displayed after the list of options */
  actionsAfter?: ActionListItemDescriptor[];
  /** Content to be displayed before the list of options */
  contentBefore?: React.ReactNode;
  /** Content to be displayed after the list of options */
  contentAfter?: React.ReactNode;
  /** Is rendered when there are no options */
  emptyState?: React.ReactNode;
  /** Callback when the selection of options is changed */
  onSelect(selected: string[]): void;
  /** Callback when the end of the list is reached */
  onEndReached?(): void;
}
export function ComboBox({
  id: idProp,
  options,
  selected,
  textField,
  preferredPosition,
  listTitle,
  allowMultiple,
  actionsBefore,
  actionsAfter,
  contentBefore,
  contentAfter,
  emptyState,
  onSelect,
  onEndReached,
}: ComboBoxProps) {
  const [selectedOption, setSelectedOption] = useState<
    OptionDescriptor | ActionListItemDescriptor | undefined
  >(undefined);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedOptions, setSelectedOptions] = useState(selected);
  const [navigableOptions, setNavigableOptions] = useState<
    (OptionDescriptor | ActionListItemDescriptor)[]
  >([]);
  const {
    value: popoverActive,
    setTrue: forcePopoverActiveTrue,
    setFalse: forcePopoverActiveFalse,
  } = useToggle(false);
  const [popoverWasActive, setPopoverWasActive] = useState(false);

  const id = useUniqueId('ComboBox', idProp);

  const getActionsWithIds = useCallback(
    (
      actions: ActionListItemDescriptor[],
      before?: boolean,
    ): ActionListItemDescriptor[] => {
      if (before) {
        return navigableOptions.slice(0, actions.length);
      }
      return navigableOptions.slice(-actions.length);
    },
    [navigableOptions],
  );

  const handlePopoverClose = useCallback(() => {
    forcePopoverActiveFalse();
    setPopoverWasActive(false);
  }, [forcePopoverActiveFalse]);

  const handlePopoverOpen = useCallback(() => {
    if (!popoverActive && navigableOptions.length > 0) {
      forcePopoverActiveTrue();
      setPopoverWasActive(true);
    }
  }, [forcePopoverActiveTrue, navigableOptions, popoverActive]);

  const visuallyUpdateSelectedOption = useCallback(
    (
      newOption: OptionDescriptor | ActionListItemDescriptor,
      oldOption: OptionDescriptor | ActionListItemDescriptor | undefined,
    ) => {
      if (oldOption) {
        oldOption.active = false;
      }
      if (newOption) {
        newOption.active = true;
      }
    },
    [],
  );

  const resetVisuallySelectedOptions = useCallback(() => {
    setSelectedOption(undefined);
    setSelectedIndex(-1);
    navigableOptions.forEach((option) => {
      option.active = false;
    });
  }, [navigableOptions]);

  const selectOptionAtIndex = useCallback(
    (newOptionIndex: number) => {
      if (!navigableOptions || navigableOptions.length === 0) {
        return;
      }

      const newSelectedOption = navigableOptions[newOptionIndex];

      visuallyUpdateSelectedOption(newSelectedOption, selectedOption);

      setSelectedOption(newSelectedOption);
      setSelectedIndex(newOptionIndex);
    },
    [navigableOptions, selectedOption, visuallyUpdateSelectedOption],
  );

  const selectNextOption = useCallback(() => {
    if (navigableOptions.length === 0) {
      return;
    }

    let newIndex = selectedIndex;

    if (selectedIndex + 1 >= navigableOptions.length) {
      newIndex = 0;
    } else {
      newIndex++;
    }

    selectOptionAtIndex(newIndex);
  }, [navigableOptions, selectOptionAtIndex, selectedIndex]);

  const selectPreviousOption = useCallback(() => {
    if (navigableOptions.length === 0) {
      return;
    }

    let newIndex = selectedIndex;

    if (selectedIndex <= 0) {
      newIndex = navigableOptions.length - 1;
    } else {
      newIndex--;
    }

    selectOptionAtIndex(newIndex);
  }, [navigableOptions, selectOptionAtIndex, selectedIndex]);

  const selectOptions = useCallback(
    (selected: string[]) => {
      selected && onSelect(selected);
      if (!allowMultiple) {
        resetVisuallySelectedOptions();
        forcePopoverActiveFalse();
        setPopoverWasActive(false);
      }
    },
    [
      allowMultiple,
      forcePopoverActiveFalse,
      onSelect,
      resetVisuallySelectedOptions,
    ],
  );

  const handleSelection = useCallback(
    (newSelected: string) => {
      let newlySelectedOptions = selected;
      if (selected.includes(newSelected)) {
        newlySelectedOptions.splice(
          newlySelectedOptions.indexOf(newSelected),
          1,
        );
      } else if (allowMultiple) {
        newlySelectedOptions.push(newSelected);
      } else {
        newlySelectedOptions = [newSelected];
      }

      selectOptions(newlySelectedOptions);
    },
    [allowMultiple, selectOptions, selected],
  );

  const handleDownArrow = useCallback(() => {
    selectNextOption();
  }, [selectNextOption]);

  const handleUpArrow = useCallback(() => {
    selectPreviousOption();
  }, [selectPreviousOption]);

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (event.keyCode !== Key.Enter) {
        return;
      }

      if (popoverActive && selectedOption) {
        if (isOption(selectedOption)) {
          event.preventDefault();
          handleSelection(selectedOption.value);
        } else {
          selectedOption.onAction && selectedOption.onAction();
        }
      }
    },
    [handleSelection, popoverActive, selectedOption],
  );

  const handleFocus = useCallback(() => {
    forcePopoverActiveTrue();
    setPopoverWasActive(true);
  }, [forcePopoverActiveTrue]);

  const handleBlur = useCallback(() => {
    forcePopoverActiveFalse();
    setPopoverWasActive(false);
    resetVisuallySelectedOptions();
  }, [forcePopoverActiveFalse, resetVisuallySelectedOptions]);

  const handleClick = useCallback(() => {
    !popoverActive && forcePopoverActiveTrue();
  }, [forcePopoverActiveTrue, popoverActive]);

  const updateIndexOfSelectedOption = useCallback(
    (newOptions: (OptionDescriptor | ActionListItemDescriptor)[]) => {
      if (selectedOption && newOptions.includes(selectedOption)) {
        selectOptionAtIndex(newOptions.indexOf(selectedOption));
      } else if (selectedIndex > newOptions.length - 1) {
        resetVisuallySelectedOptions();
      } else {
        selectOptionAtIndex(selectedIndex);
      }
    },
    [
      resetVisuallySelectedOptions,
      selectOptionAtIndex,
      selectedIndex,
      selectedOption,
    ],
  );

  useEffect(() => {
    if (selectedOptions !== selected) {
      setSelectedOptions(selected);
    }
  }, [selected, selectedOptions]);

  useEffect(() => {
    let newNavigableOptions: (
      | OptionDescriptor
      | ActionListItemDescriptor
    )[] = [];
    if (actionsBefore) {
      newNavigableOptions = newNavigableOptions.concat(actionsBefore);
    }
    if (options) {
      newNavigableOptions = newNavigableOptions.concat(options);
    }
    if (actionsAfter) {
      newNavigableOptions = newNavigableOptions.concat(actionsAfter);
    }
    newNavigableOptions = assignOptionIds(newNavigableOptions, id);
    setNavigableOptions(newNavigableOptions);
  }, [actionsAfter, actionsBefore, id, options]);

  useEffect(() => {
    updateIndexOfSelectedOption(navigableOptions);
  }, [navigableOptions, updateIndexOfSelectedOption]);

  useEffect(() => {
    if (
      navigableOptions.length === 0 &&
      !contentBefore &&
      !contentAfter &&
      !emptyState
    ) {
      forcePopoverActiveFalse();
    } else if (popoverWasActive && navigableOptions.length !== 0) {
      forcePopoverActiveTrue();
    }
  }, [
    contentAfter,
    contentBefore,
    emptyState,
    forcePopoverActiveFalse,
    forcePopoverActiveTrue,
    navigableOptions,
    popoverWasActive,
  ]);

  let actionsBeforeMarkup: JSX.Element | undefined;
  if (actionsBefore && actionsBefore.length > 0) {
    actionsBeforeMarkup = (
      <ActionList
        actionRole="option"
        items={getActionsWithIds(actionsBefore, true)}
      />
    );
  }

  let actionsAfterMarkup: JSX.Element | undefined;
  if (actionsAfter && actionsAfter.length > 0) {
    actionsAfterMarkup = (
      <ActionList actionRole="option" items={getActionsWithIds(actionsAfter)} />
    );
  }

  const optionsMarkup = options.length > 0 && (
    <OptionList
      role="presentation"
      optionRole="option"
      options={filterForOptions(navigableOptions)}
      onChange={selectOptions}
      selected={selectedOptions}
      title={listTitle}
      allowMultiple={allowMultiple}
    />
  );

  const emptyStateMarkup = !actionsAfter &&
    !actionsBefore &&
    !contentAfter &&
    !contentBefore &&
    options.length === 0 &&
    emptyState && <div className={styles.EmptyState}>{emptyState}</div>;

  const selectedOptionId = selectedOption
    ? `${id}-${selectedIndex}`
    : undefined;

  const context = {
    id,
    selectedOptionId,
  };

  return (
    <ComboBoxContext.Provider value={context}>
      <div
        onClick={handleClick}
        role="combobox"
        aria-expanded={popoverActive}
        aria-owns={id}
        aria-controls={id}
        aria-haspopup
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={0}
      >
        <KeypressListener keyCode={Key.DownArrow} handler={handleDownArrow} />
        <KeypressListener keyCode={Key.UpArrow} handler={handleUpArrow} />
        <EventListener event="keydown" handler={handleEnter} />
        <KeypressListener keyCode={Key.Escape} handler={handlePopoverClose} />
        <Popover
          activator={textField}
          active={popoverActive}
          onClose={handlePopoverClose}
          preferredPosition={preferredPosition}
          fullWidth
          preventAutofocus
        >
          <Popover.Pane onScrolledToBottom={onEndReached}>
            <div id={id} role="listbox" aria-multiselectable={allowMultiple}>
              {contentBefore}
              {actionsBeforeMarkup}
              {optionsMarkup}
              {actionsAfterMarkup}
              {contentAfter}
              {emptyStateMarkup}
            </div>
          </Popover.Pane>
        </Popover>
      </div>
    </ComboBoxContext.Provider>
  );
}

function assignOptionIds(
  options: (OptionDescriptor | ActionListItemDescriptor)[],
  id: string,
): OptionDescriptor[] | ActionListItemDescriptor[] {
  return options.map((option, optionIndex) => ({
    ...option,
    id: `${id}-${optionIndex}`,
  }));
}

function isOption(
  navigableOption: OptionDescriptor | ActionListItemDescriptor,
): navigableOption is OptionDescriptor {
  return 'value' in navigableOption && navigableOption.value !== undefined;
}

function filterForOptions(
  mixedArray: (ActionListItemDescriptor | OptionDescriptor)[],
): OptionDescriptor[] {
  return mixedArray.filter(isOption);
}
