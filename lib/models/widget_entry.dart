import 'package:hive/hive.dart';

part 'widget_entry.g.dart';

@HiveType(typeId: 0)
class WidgetEntry {
  @HiveField(0)
  final String widgetId;

  @HiveField(1)
  final String timestamp;

  @HiveField(2)
  final String content;

  WidgetEntry({
    required this.widgetId,
    required this.content,
  }) : timestamp = DateTime.now().toIso8601String();
}
