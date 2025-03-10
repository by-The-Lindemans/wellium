import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/db_connection.dart';

// Provider for all entries
final entriesProvider = StateNotifierProvider<EntriesNotifier, List<Map<String, dynamic>>>((ref) {
  return EntriesNotifier();
});

class EntriesNotifier extends StateNotifier<List<Map<String, dynamic>>> {
  EntriesNotifier() : super([]) {
    // Load entries when created
    _loadEntries();
  }

  Future<void> _loadEntries() async {
    try {
      final entries = await DbConnection.instance.getEntries();
      state = entries;
    } catch (e) {
      print('Error loading entries: $e');
    }
  }

  Future<void> addEntry(String text) async {
    try {
      await DbConnection.instance.addEntry(text);
      // Reload entries after adding a new one
      await _loadEntries();
    } catch (e) {
      print('Error adding entry: $e');
    }
  }
}
