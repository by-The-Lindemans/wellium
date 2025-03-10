import 'package:hive_flutter/hive_flutter.dart';

part 'note.g.dart';

@HiveType(typeId: 10)
class Note extends HiveObject {
  @HiveField(0)
  final String text;
  
  @HiveField(1)
  final DateTime timestamp;
  
  Note({
    required this.text,
    DateTime? timestamp,
  }) : this.timestamp = timestamp ?? DateTime.now();
  
  // Add this static factory method
  static Note fromMap(Map<String, dynamic> map) {
    return Note(
      text: map['text'] ?? '',
      timestamp: map['timestamp'] != null 
          ? DateTime.fromMillisecondsSinceEpoch(map['timestamp']) 
          : DateTime.now(),
    );
  }
  
  Map<String, dynamic> toMap() {
    return {
      'text': text,
      'timestamp': timestamp.millisecondsSinceEpoch,
    };
  }
}