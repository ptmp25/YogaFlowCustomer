// src/screens/ClassDetailScreen.js

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {database} from '../firebase/config'; // Change this
import {ref, get} from 'firebase/database'; // Add this

const ClassDetailScreen = ({route, navigation}) => {
  const {id} = route.params;
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Use database from firebase/config.js, not db
        const classRef = ref(database, `classes/${id}`);
        const snapshot = await get(classRef);

        if (!snapshot.exists()) {
          setError('Class not found');
          setLoading(false);
          return;
        }

        const classInfo = {
          id: snapshot.key,
          ...snapshot.val(),
        };

        setClassData(classInfo);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load class details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B8E23" />
      </View>
    );
  }

  if (error || !classData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Class not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Yoga Class {classData.courseId || ''}</Text>
        <View style={styles.availabilityBadge}>
          <Text style={styles.availabilityText}>
            {classData.availableSlots} spots available
          </Text>
        </View>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailText}>{classData.date}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Teacher:</Text>
          <Text style={styles.detailText}>{classData.teacher}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Room:</Text>
          <Text style={styles.detailText}>{classData.room}</Text>
        </View>

        {classData.additionalComments && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Additional Information:</Text>
            <Text style={styles.commentsText}>
              {classData.additionalComments}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bookingSection}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => {
            // Add booking logic here
            navigation.navigate('BookingConfirmation', {classData});
          }}
          disabled={classData.availableSlots <= 0}>
          <Text style={styles.bookButtonText}>
            {classData.availableSlots > 0 ? 'Book Class' : 'Class Full'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#6B8E23',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  availabilityBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  availabilityText: {
    fontWeight: 'bold',
    color: '#6B8E23',
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  detailLabel: {
    width: 70,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#555',
  },
  detailText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  commentsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentsTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  commentsText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  bookingSection: {
    padding: 20,
    alignItems: 'center',
  },
  bookButton: {
    backgroundColor: '#6B8E23',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6B8E23',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ClassDetailScreen;
