// components/ClassCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';

const ClassCard = ({ classItem, onPress }) => {
  // Parse the date from dd/MM/yyyy format
  const classDate = parse(classItem.date, 'dd/MM/yyyy', new Date());
  const formattedDate = format(classDate, 'EEE, MMM d');
  const dayOfWeek = format(classDate, 'EEEE');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* <View style={styles.header}>
        <Text style={styles.className}>Yoga Class {classItem.courseId}</Text>
        <View style={styles.availabilityTag}>
          <Text style={styles.availabilityText}>
            {classItem.availableSlots} {classItem.availableSlots === 1 ? 'spot' : 'spots'} left
          </Text>
        </View>
      </View> */}
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() =>
          navigation.navigate('BookingConfirmation', {classData: classData})
        }
        disabled={classData.availableSlots <= 0}>
        <Text style={styles.bookButtonText}>
          {classData.availableSlots > 0 ? 'Book Slot' : 'Class Full'}
        </Text>
      </TouchableOpacity>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color="#6B8E23" />
          <Text style={styles.detailText}>{formattedDate}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={18} color="#6B8E23" />
          <Text style={styles.detailText}>{classItem.teacher}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color="#6B8E23" />
          <Text style={styles.detailText}>{classItem.room}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.dayIndicator}>{dayOfWeek}</Text>
        <View style={styles.viewDetails}>
          <Text style={styles.viewDetailsText}>Book Slot</Text>
          <Ionicons name="chevron-forward" size={16} color="#6B8E23" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  availabilityTag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  availabilityText: {
    fontSize: 12,
    color: '#6B8E23',
    fontWeight: 'bold',
  },
  details: {
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  dayIndicator: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6B8E23',
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#6B8E23',
    fontWeight: 'bold',
    marginRight: 5,
  },
});

export default ClassCard;



