import 'package:flutter/material.dart';

import '../models/wellium_widget.dart'; // Updated import
import 'input_block.dart';
import 'progress_bar.dart';

class WidgetTile extends StatelessWidget {
  final WelliumWidget welliumWidget; // Updated type and name
  final Function(WelliumWidget) onSelect; // Updated type

  const WidgetTile({
    super.key,
    required this.welliumWidget, // Updated parameter name
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onSelect(welliumWidget),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(welliumWidget.name),
            if (!welliumWidget.isHeader) ...[
              _buildContent(),
              Text(welliumWidget.description),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    switch (welliumWidget.content) {
      case WidgetContent.text:
        return const Text("Sample text");
      case WidgetContent.progress:
        return const ProgressBar(progress: 0.5);
      case WidgetContent.input:
        return InputBlock(widgetId: welliumWidget.widgetId);
    }
  }
}
