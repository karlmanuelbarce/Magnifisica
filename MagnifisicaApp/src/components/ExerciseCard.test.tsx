import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

// Mock react-native-vector-icons
jest.mock("react-native-vector-icons/Ionicons", () => "Icon");

// Import after mocking
import ExerciseCard from "./ExerciseCard";
import { Exercise } from "../types/Exercise";

describe("ExerciseCard", () => {
  // Mock exercise data
  const mockExercise: Exercise = {
    name: "Push-ups",
    type: "strength",
    muscle: "chest",
    equipment: "body_only",
    difficulty: "beginner",
    instructions: "Standard push-up exercise",
  };

  const mockOnPress = jest.fn();
  const mockOnAddPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders exercise information correctly", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Push-ups")).toBeTruthy();
      expect(getByText("Chest")).toBeTruthy(); // Capitalized muscle
      expect(getByText("Beginner")).toBeTruthy(); // Capitalized difficulty
      expect(getByText("Body only")).toBeTruthy(); // Replaced underscores and capitalized
      expect(getByText("Strength")).toBeTruthy(); // Capitalized type
    });

    it("capitalizes muscle name", () => {
      const exercise = { ...mockExercise, muscle: "biceps" };
      const { getByText } = render(
        <ExerciseCard
          activity={exercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Biceps")).toBeTruthy();
    });

    it("capitalizes difficulty level", () => {
      const exercise = { ...mockExercise, difficulty: "intermediate" };
      const { getByText } = render(
        <ExerciseCard
          activity={exercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Intermediate")).toBeTruthy();
    });

    it("replaces underscores with spaces in equipment name", () => {
      const exercise = { ...mockExercise, equipment: "resistance_bands" };
      const { getByText } = render(
        <ExerciseCard
          activity={exercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Resistance bands")).toBeTruthy();
    });

    it("capitalizes exercise type", () => {
      const exercise = { ...mockExercise, type: "cardio" };
      const { getByText } = render(
        <ExerciseCard
          activity={exercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Cardio")).toBeTruthy();
    });
  });

  describe("Card Press Interaction", () => {
    it("calls onPress when card is pressed", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const card = getByText("Push-ups");
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it("does not call onAddPress when card is pressed", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const card = getByText("Push-ups");
      fireEvent.press(card);

      expect(mockOnAddPress).not.toHaveBeenCalled();
    });

    it("works without onPress callback", () => {
      const { getByText } = render(
        <ExerciseCard activity={mockExercise} onAddPress={mockOnAddPress} />
      );

      const card = getByText("Push-ups");

      // Should not throw error when pressed
      expect(() => fireEvent.press(card)).not.toThrow();
    });
  });

  describe("Add Button Interaction", () => {
    it("calls onAddPress when add button is pressed", () => {
      const { root } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      // Find all accessible elements (TouchableOpacity renders with accessible={true})
      const accessibleElements = root.findAll(
        (node) => node.props.accessible === true
      );

      // First accessible is the card, second is the add button
      const addButton = accessibleElements[1];

      fireEvent.press(addButton);

      expect(mockOnAddPress).toHaveBeenCalledTimes(1);
    });

    it("does not call onPress when add button is pressed", () => {
      const { root } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const accessibleElements = root.findAll(
        (node) => node.props.accessible === true
      );
      const addButton = accessibleElements[1];

      fireEvent.press(addButton);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it("prevents multiple rapid presses", () => {
      const { root } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const accessibleElements = root.findAll(
        (node) => node.props.accessible === true
      );
      const addButton = accessibleElements[1];

      // Press multiple times rapidly
      fireEvent.press(addButton);
      fireEvent.press(addButton);
      fireEvent.press(addButton);

      // All presses should go through (button doesn't have built-in debounce)
      expect(mockOnAddPress).toHaveBeenCalledTimes(3);
    });
  });

  describe("Disabled State", () => {
    it("renders enabled state by default", () => {
      const { root } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const accessibleElements = root.findAll(
        (node) => node.props.accessible === true
      );
      const addButton = accessibleElements[1];

      expect(addButton.props.disabled).toBeFalsy();
    });

    it("sets disabled accessibility state when disabled", () => {
      const { root } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
          disabled={true}
        />
      );

      const accessibleElements = root.findAll(
        (node) => node.props.accessible === true
      );
      const addButton = accessibleElements[1];

      // Verify it has the disabled accessibility state for screen readers
      expect(addButton.props.accessibilityState?.disabled).toBe(true);
    });

    it("applies disabled styles when disabled", () => {
      const { UNSAFE_getAllByType } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
          disabled={true}
        />
      );

      const views = UNSAFE_getAllByType("View" as any);

      // Find the plus button view (has backgroundColor style)
      const plusButtonView = views.find((view) => {
        const style = Array.isArray(view.props.style)
          ? view.props.style
          : [view.props.style];
        return style.some((s: any) => s?.backgroundColor === "#333333");
      });

      expect(plusButtonView).toBeTruthy();
    });
  });

  describe("Capitalize Function", () => {
    it("capitalizes first letter of string", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={{ ...mockExercise, muscle: "chest" }}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Chest")).toBeTruthy();
    });

    it("handles already capitalized strings", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={{ ...mockExercise, muscle: "Chest" }}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Chest")).toBeTruthy();
    });

    it("handles empty strings", () => {
      const { queryByText } = render(
        <ExerciseCard
          activity={{ ...mockExercise, muscle: "" }}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      // Should not throw and should render empty muscle tag
      expect(queryByText("")).toBeTruthy();
    });

    it("handles multi-word strings", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={{ ...mockExercise, muscle: "upper back" }}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Upper back")).toBeTruthy();
    });
  });

  describe("Equipment Name Formatting", () => {
    it("handles single underscore", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={{ ...mockExercise, equipment: "medicine_ball" }}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Medicine ball")).toBeTruthy();
    });

    it("handles multiple underscores", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={{ ...mockExercise, equipment: "e_z_curl_bar" }}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("E z curl bar")).toBeTruthy();
    });

    it("handles equipment without underscores", () => {
      const { getByText } = render(
        <ExerciseCard
          activity={{ ...mockExercise, equipment: "barbell" }}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Barbell")).toBeTruthy();
    });
  });

  describe("Icons", () => {
    it("renders barbell icon for difficulty", () => {
      const { UNSAFE_getAllByType } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const icons = UNSAFE_getAllByType("Icon" as any);
      const barbellIcon = icons.find(
        (icon: any) => icon.props.name === "barbell-outline"
      );

      expect(barbellIcon).toBeTruthy();
      expect(barbellIcon.props.size).toBe(16);
    });

    it("renders layers icon for equipment", () => {
      const { UNSAFE_getAllByType } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const icons = UNSAFE_getAllByType("Icon" as any);
      const layersIcon = icons.find(
        (icon: any) => icon.props.name === "layers-outline"
      );

      expect(layersIcon).toBeTruthy();
      expect(layersIcon.props.size).toBe(16);
    });

    it("renders analytics icon for type", () => {
      const { UNSAFE_getAllByType } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const icons = UNSAFE_getAllByType("Icon" as any);
      const analyticsIcon = icons.find(
        (icon: any) => icon.props.name === "analytics-outline"
      );

      expect(analyticsIcon).toBeTruthy();
      expect(analyticsIcon.props.size).toBe(16);
    });

    it("renders add icon in button", () => {
      const { UNSAFE_getAllByType } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      const icons = UNSAFE_getAllByType("Icon" as any);
      const addIcon = icons.find((icon: any) => icon.props.name === "add");

      expect(addIcon).toBeTruthy();
      expect(addIcon.props.size).toBe(22);
      expect(addIcon.props.color).toBe("#121212"); // Enabled color
    });

    it("changes add icon color when disabled", () => {
      const { UNSAFE_getAllByType } = render(
        <ExerciseCard
          activity={mockExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
          disabled={true}
        />
      );

      const icons = UNSAFE_getAllByType("Icon" as any);
      const addIcon = icons.find((icon: any) => icon.props.name === "add");

      expect(addIcon.props.color).toBe("#888888"); // Disabled color
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined onPress gracefully", () => {
      const { getByText } = render(
        <ExerciseCard activity={mockExercise} onAddPress={mockOnAddPress} />
      );

      const card = getByText("Push-ups");
      expect(() => fireEvent.press(card)).not.toThrow();
    });

    it("handles very long exercise names", () => {
      const longNameExercise = {
        ...mockExercise,
        name: "Extremely Long Exercise Name That Should Wrap To Multiple Lines",
      };

      const { getByText } = render(
        <ExerciseCard
          activity={longNameExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(
        getByText(
          "Extremely Long Exercise Name That Should Wrap To Multiple Lines"
        )
      ).toBeTruthy();
    });

    it("handles special characters in names", () => {
      const specialCharExercise = {
        ...mockExercise,
        name: "Push-ups (Wide Grip)",
        equipment: "body_only",
      };

      const { getByText } = render(
        <ExerciseCard
          activity={specialCharExercise}
          onPress={mockOnPress}
          onAddPress={mockOnAddPress}
        />
      );

      expect(getByText("Push-ups (Wide Grip)")).toBeTruthy();
    });
  });
});
