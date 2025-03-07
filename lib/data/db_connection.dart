import 'package:hive_flutter/hive_flutter.dart';

import '../models/widget_entry.dart';

class DbConnection {
  static const String boxName = 'widget_entries';

  static final DbConnection instance = DbConnection._();

  DbConnection._();

  late Box _box;

  Future<void> init() async {
    _box = await Hive.openBox(boxName);
  }

  Future<WidgetEntry> addEntry(String widgetId, String content) async {
    final entry = WidgetEntry(
      widgetId: widgetId,
      timestamp: DateTime.now().toIso8601String(),
      content: content,
    );

    final Map<String, dynamic> data = {
      'widget_id': entry.widgetId,
      'timestamp': entry.timestamp,
      'content': entry.content,
    };

    await _box.add(data);
    return entry;
  }

  Future<List<WidgetEntry>> getEntries(String widgetId) async {
    final entries = <WidgetEntry>[];

    for (var i = 0; i < _box.length; i++) {
      final item = _box.getAt(i);
      if (item is Map && item['widget_id'] == widgetId) {
        entries.add(WidgetEntry(
          widgetId: item['widget_id'] as String,
          timestamp: item['timestamp'] as String,
          content: item['content'] as String,
        ));
      }
    }

    return entries.reversed.toList();
  }
}
