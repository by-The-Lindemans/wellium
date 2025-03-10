import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

class BoxManager {
  static final _boxNames = [
    'patient',
    'conditions',
    'observations',
    'medicationStatements',
    'procedures',
    'encounters',
    'diagnosticReports',
    'immunizations',
    'documentReferences',
    'terminology_maps',
    'entries', // Keep for backward compatibility during migration
  ];

  static Future<void> openBoxes() async {
    for (final name in _boxNames) {
      if (!Hive.isBoxOpen(name)) {
        await Hive.openBox(name);
      }
    }
  }
}

// Provider for box initialization
final boxInitializationProvider = FutureProvider<void>((ref) async {
  await BoxManager.openBoxes();
  return;
});