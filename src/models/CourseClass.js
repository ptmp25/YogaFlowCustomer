export default class CourseClass {
  constructor(
    id,
    courseId,
    date,
    teacher,
    room,
    availableSlots,
    additionalComments
  ) {
    this.id = id;
    this.courseId = courseId;
    this.date = date; // Format: "DD/MM/YYYY"
    this.teacher = teacher;
    this.room = room;
    this.availableSlots = availableSlots;
    this.additionalComments = additionalComments;
  }

  static fromFirebase(doc) {
    const data = doc.data();
    return new CourseClass(
      doc.id,
      data.courseId,
      data.date,
      data.teacher,
      data.room,
      data.availableSlots,
      data.additionalComments
    );
  }

  // Helper method to get day of week from date string
  getDayOfWeek() {
    const [day, month, year] = this.date.split("/");
    const dateObj = new Date(`${year}-${month}-${day}`);
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return daysOfWeek[dateObj.getDay()];
  }

  // Helper method to get formatted time (if we add time to the model later)
  getFormattedTime() {
    // This would need to be implemented if we add time to the model
    return "N/A";
  }

  // Check if class is available for booking
  isAvailable() {
    return this.availableSlots > 0;
  }
}
