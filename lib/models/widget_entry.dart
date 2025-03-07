class WidgetEntry {
  final String widgetId;
  final String timestamp;
  final String content;

  WidgetEntry({
    required this.widgetId,
    required this.timestamp,
    required this.content,
  });

  Map<String, dynamic> toMap() {
    return {
      'widget_id': widgetId,
      'timestamp': timestamp,
      'content': content,
    };
  }

  factory WidgetEntry.fromMap(Map<String, dynamic> map) {
    return WidgetEntry(
      widgetId: map['widget_id'] as String,
      timestamp: map['timestamp'] as String,
      content: map['content'] as String,
    );
  }
}
