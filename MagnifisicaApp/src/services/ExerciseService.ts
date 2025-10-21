import { Exercise } from "../types/Exercise";

const API_KEY = "iZQXUe+6XAbP8lH4Gu4fFQ==DTGLyd4gYQ0aLlRU";
const API_URL = "https://api.api-ninjas.com/v1/exercises";

export const fetchAllExercises = async (): Promise<Exercise[]> => {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data: Exercise[] = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch exercises:", error);
    throw error;
  }
};
