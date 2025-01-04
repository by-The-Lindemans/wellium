import 'package:flutter/material.dart';

import '../models/wellium_widget.dart';
import 'input_block.dart';

class ModalOverlay extends StatelessWidget {
  final WelliumWidget welliumWidget;
  final VoidCallback onClose;

  const ModalOverlay({
    super.key,
    required this.welliumWidget,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onClose,
      child: Container(
        color: Colors.black54,
        child: DraggableScrollableSheet(
          initialChildSize: 0.66,
          builder: (context, scrollController) {
            return Container(
              color: Colors.black,
              child: ListView(
                controller: scrollController,
                children: [
                  Text(welliumWidget.name),
                  if (welliumWidget.content == WidgetContent.input)
                    InputBlock(widgetId: welliumWidget.widgetId),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
