import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/fhir/patient.dart';
import '../data/hive_init_provider.dart';
import 'package:uuid/uuid.dart';

class PatientRepository {
  final Box<FhirPatient> box;
  static const String _currentPatientKey = 'current_patient';
  
  PatientRepository(this.box);
  
  // Get the current patient (app user) - create if doesn't exist
  Future<FhirPatient> getCurrentPatient() async {
    if (!box.containsKey(_currentPatientKey)) {
      // Create a default patient profile for the app user
      final patient = FhirPatient(
        id: const Uuid().v4(),
        active: true,
        // Other defaults can be set here or gathered during onboarding
      );
      
      await box.put(_currentPatientKey, patient);
    }
    
    return box.get(_currentPatientKey)!;
  }
  
  Future<void> updatePatient(FhirPatient patient) async {
    await box.put(_currentPatientKey, patient);
  }
}

// Provider for the patient repository
final patientRepositoryProvider = FutureProvider<PatientRepository>((ref) async {
  final encryptionKey = await ref.watch(encryptionKeyProvider.future);
  
  // Get or open the patient box
  Box<FhirPatient> box;
  if (Hive.isBoxOpen('patient')) {
    box = Hive.box<FhirPatient>('patient');
  } else {
    // Make sure Patient adapter is registered
    if (!Hive.isAdapterRegistered(5)) {
      Hive.registerAdapter(FhirPatientAdapter());
    }
    
    // Open the box with encryption
    box = await Hive.openBox<FhirPatient>(
      'patient',
      encryptionCipher: HiveAesCipher(encryptionKey),
    );
  }
  
  return PatientRepository(box);
});

// Provider to access the current patient
final currentPatientProvider = FutureProvider<FhirPatient>((ref) async {
  final repository = await ref.watch(patientRepositoryProvider.future);
  return repository.getCurrentPatient();
});
