// services/courseService.js
import {ref, get} from 'firebase/database';
import {database} from '../firebase/config';

// Get course by ID
export const getCourseById = async courseId => {
  try {
    const courseRef = ref(database, `courses/${courseId}`);
    const snapshot = await get(courseRef);

    if (!snapshot.exists()) {
      throw new Error('Course not found');
    }

    return {
      id: snapshot.key,
      ...snapshot.val(),
    };
  } catch (error) {
    console.error('Error fetching course:', error);
    throw error;
  }
};
