import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

// Mock react-native-vector-icons
jest.mock("react-native-vector-icons/Ionicons", () => "Icon");

// Import after mocking
import ExerciseTodoCard from "./ExerciseTodoCard";

describe("ExerciseTodoCard", () => {
  const mockOnToggle = jest.fn();
  const mockOnRemove = jest.fn();

  const mockExercise = {
    id: "exercise-1",
    name: "Push-ups",
    isDone: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders exercise name correctly", () => {
      const { getByText } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      expect(getByText("Push-ups")).toBeTruthy();
    });

    it("renders with pending state styles when not done", () => {
      const { getByText } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const text = getByText("Push-ups");

      // Text should not have line-through style when not done
      expect(text.props.style).not.toContainEqual(
        expect.objectContaining({ textDecorationLine: "line-through" })
      );
    });

    it("renders with done state styles when completed", () => {
      const doneExercise = { ...mockExercise, isDone: true };

      const { getByText } = render(
        <ExerciseTodoCard
          exercise={doneExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const text = getByText("Push-ups");
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];

      // Check if any style has line-through
      const hasLineThrough = styles.some(
        (style: any) => style?.textDecorationLine === "line-through"
      );

      expect(hasLineThrough).toBe(true);
    });

    it("displays checkbox when not in editing mode", () => {
      const { getByTestId, queryByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      expect(getByTestId(`toggle-${mockExercise.id}`)).toBeTruthy();
      expect(queryByTestId(`remove-${mockExercise.id}`)).toBeNull();
    });

    it("displays remove button when in editing mode", () => {
      const { getByTestId, queryByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={true}
        />
      );

      expect(getByTestId(`remove-${mockExercise.id}`)).toBeTruthy();
      expect(queryByTestId(`toggle-${mockExercise.id}`)).toBeNull();
    });

    it("shows checkmark icon when exercise is done", () => {
      const doneExercise = { ...mockExercise, isDone: true };

      const { UNSAFE_getAllByType } = render(
        <ExerciseTodoCard
          exercise={doneExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const icons = UNSAFE_getAllByType("Icon" as any);
      const checkmarkIcon = icons.find(
        (icon: any) => icon.props.name === "checkmark"
      );

      expect(checkmarkIcon).toBeTruthy();
      expect(checkmarkIcon.props.size).toBe(20);
      expect(checkmarkIcon.props.color).toBe("#121212");
    });

    it("does not show checkmark icon when exercise is not done", () => {
      const { UNSAFE_queryAllByType } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const icons = UNSAFE_queryAllByType("Icon" as any);
      const checkmarkIcon = icons.find(
        (icon: any) => icon.props.name === "checkmark"
      );

      expect(checkmarkIcon).toBeUndefined();
    });

    it("shows trash icon when in editing mode", () => {
      const { UNSAFE_getAllByType } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={true}
        />
      );

      const icons = UNSAFE_getAllByType("Icon" as any);
      const trashIcon = icons.find(
        (icon: any) => icon.props.name === "trash-outline"
      );

      expect(trashIcon).toBeTruthy();
      expect(trashIcon.props.size).toBe(20);
      expect(trashIcon.props.color).toBe("#fff");
    });
  });

  describe("Toggle Functionality", () => {
    it("calls onToggle with exercise id when checkbox is pressed", () => {
      const { getByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const checkbox = getByTestId(`toggle-${mockExercise.id}`);
      fireEvent.press(checkbox);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
      expect(mockOnToggle).toHaveBeenCalledWith("exercise-1");
    });

    it("does not call onRemove when checkbox is pressed", () => {
      const { getByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const checkbox = getByTestId(`toggle-${mockExercise.id}`);
      fireEvent.press(checkbox);

      expect(mockOnRemove).not.toHaveBeenCalled();
    });

    it("can toggle multiple times", () => {
      const { getByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const checkbox = getByTestId(`toggle-${mockExercise.id}`);

      fireEvent.press(checkbox);
      fireEvent.press(checkbox);
      fireEvent.press(checkbox);

      expect(mockOnToggle).toHaveBeenCalledTimes(3);
    });
  });

  describe("Remove Functionality", () => {
    it("calls onRemove with exercise id when remove button is pressed", () => {
      const { getByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={true}
        />
      );

      const removeButton = getByTestId(`remove-${mockExercise.id}`);
      fireEvent.press(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
      expect(mockOnRemove).toHaveBeenCalledWith("exercise-1");
    });

    it("does not call onToggle when remove button is pressed", () => {
      const { getByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={true}
        />
      );

      const removeButton = getByTestId(`remove-${mockExercise.id}`);
      fireEvent.press(removeButton);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe("Editing Mode Toggle", () => {
    it("switches from checkbox to remove button when isEditing changes", () => {
      const { rerender, getByTestId, queryByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      // Initially shows checkbox
      expect(getByTestId(`toggle-${mockExercise.id}`)).toBeTruthy();
      expect(queryByTestId(`remove-${mockExercise.id}`)).toBeNull();

      // Switch to editing mode
      rerender(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={true}
        />
      );

      // Now shows remove button
      expect(queryByTestId(`toggle-${mockExercise.id}`)).toBeNull();
      expect(getByTestId(`remove-${mockExercise.id}`)).toBeTruthy();
    });
  });

  describe("Exercise State Changes", () => {
    it("updates styles when exercise is marked as done", () => {
      const { rerender, getByText, UNSAFE_queryAllByType } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      // Initially no checkmark
      let icons = UNSAFE_queryAllByType("Icon" as any);
      let checkmarkIcon = icons.find(
        (icon: any) => icon.props.name === "checkmark"
      );
      expect(checkmarkIcon).toBeUndefined();

      // Mark as done
      const doneExercise = { ...mockExercise, isDone: true };
      rerender(
        <ExerciseTodoCard
          exercise={doneExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      // Now has checkmark
      icons = UNSAFE_queryAllByType("Icon" as any);
      checkmarkIcon = icons.find(
        (icon: any) => icon.props.name === "checkmark"
      );
      expect(checkmarkIcon).toBeTruthy();

      // Text has line-through
      const text = getByText("Push-ups");
      const styles = Array.isArray(text.props.style)
        ? text.props.style.flat()
        : [text.props.style];
      const hasLineThrough = styles.some(
        (style: any) => style?.textDecorationLine === "line-through"
      );
      expect(hasLineThrough).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles very long exercise names", () => {
      const longExercise = {
        ...mockExercise,
        name: "This is a very long exercise name that should wrap to multiple lines if needed",
      };

      const { getByText } = render(
        <ExerciseTodoCard
          exercise={longExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      expect(
        getByText(
          "This is a very long exercise name that should wrap to multiple lines if needed"
        )
      ).toBeTruthy();
    });

    it("handles special characters in exercise name", () => {
      const specialExercise = {
        ...mockExercise,
        name: "Push-ups (3 sets x 10 reps) @home",
      };

      const { getByText } = render(
        <ExerciseTodoCard
          exercise={specialExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      expect(getByText("Push-ups (3 sets x 10 reps) @home")).toBeTruthy();
    });

    it("handles different exercise IDs correctly", () => {
      const exercise1 = { ...mockExercise, id: "ex-123" };
      const exercise2 = { ...mockExercise, id: "ex-456" };

      const { getByTestId: getByTestId1 } = render(
        <ExerciseTodoCard
          exercise={exercise1}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      const { getByTestId: getByTestId2 } = render(
        <ExerciseTodoCard
          exercise={exercise2}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      expect(getByTestId1("toggle-ex-123")).toBeTruthy();
      expect(getByTestId2("toggle-ex-456")).toBeTruthy();
    });

    it("renders correctly with empty name", () => {
      const emptyExercise = { ...mockExercise, name: "" };

      const { getByText } = render(
        <ExerciseTodoCard
          exercise={emptyExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      // Should render without crashing
      expect(getByText("")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("provides testID for toggle button", () => {
      const { getByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={false}
        />
      );

      expect(getByTestId(`toggle-${mockExercise.id}`)).toBeTruthy();
    });

    it("provides testID for remove button", () => {
      const { getByTestId } = render(
        <ExerciseTodoCard
          exercise={mockExercise}
          onToggle={mockOnToggle}
          onRemove={mockOnRemove}
          isEditing={true}
        />
      );

      expect(getByTestId(`remove-${mockExercise.id}`)).toBeTruthy();
    });
  });
});
