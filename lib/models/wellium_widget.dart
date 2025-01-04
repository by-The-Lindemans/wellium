class WelliumWidget {
  // Changed from Widget to WelliumWidget
  final String name;
  final String description;
  final double widgetAspectRatio;
  final bool isHeader;
  final WidgetContent content;

  WelliumWidget({
    // Changed constructor name
    required this.name,
    required this.description,
    required this.widgetAspectRatio,
    required this.isHeader,
    required this.content,
  });

  String get widgetId => name.isEmpty
      ? 'widget-title'
      : 'widget-${name.toLowerCase().replaceAll(' ', '-')}';
}

enum WidgetContent { text, progress, input }
