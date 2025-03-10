import 'package:hive_flutter/hive_flutter.dart';

// Temporary compatibility class to prevent crashes until full migration
class DbConnection {
  static final DbConnection instance = DbConnection._internal();
  late Box _box;

  DbConnection._internal();

  Future<void> init() async {
    // Open a temporary compatibility box
    _box = await Hive.openBox('entries');
  }

  Future<void> addEntry(String text) async {
    if (!Hive.isBoxOpen('entries')) {
      await init();
    }
    await _box.add({'text': text, 'timestamp': DateTime.now().millisecondsSinceEpoch});
  }

  Future<List<Map<String, dynamic>>> getEntries() async {
    if (!Hive.isBoxOpen('entries')) {
      await init();
    }
    return _box.values.map((item) => Map<String, dynamic>.from(item)).toList();
  }
}
