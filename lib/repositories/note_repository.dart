import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/note.dart';

class NoteRepository {
  final Box<dynamic> box;

  NoteRepository(this.box);

  Future<void> addNote(String text) async {
    final note = Note(text: text);
    await box.add(note.toMap());
  }

  List<Note> getNotes() {
    try {
      return box.values.map((item) {
        if (item is Note) return item;
        return Note.fromMap(Map<String, dynamic>.from(item));
      }).toList();
    } catch (e) {
      print('Error getting notes: $e');
      return [];
    }
  }
}

final noteRepositoryProvider = Provider<NoteRepository>((ref) {
  final box = Hive.box('entries');
  return NoteRepository(box);
});

final notesProvider = Provider<List<Note>>((ref) {
  final repository = ref.watch(noteRepositoryProvider);
  return repository.getNotes();
});