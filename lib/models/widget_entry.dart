class WidgetEntry {
  final String widgetId;
  final String timestamp;
  final String content;
  final bool isHeader;

  WidgetEntry({
    required this.widgetId,
    required this.timestamp,
    required this.content,
    this.isHeader = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'widget_id': widgetId,
      'timestamp': timestamp,
      'content': content,
      'is_header': isHeader,
    };
  }

  factory WidgetEntry.fromMap(Map<String, dynamic> map) {
    return WidgetEntry(
      widgetId: map['widget_id'] as String,
      timestamp: map['timestamp'] as String,
      content: map['content'] as String,
      isHeader: map['is_header'] as bool? ?? false,
    );
  }
}