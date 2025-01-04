import 'package:flutter/material.dart';

import '../models/wellium_widget.dart';
import '../widgets/modal_overlay.dart';
import '../widgets/widget_tile.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  WelliumWidget? selectedWidget;
  final List<WelliumWidget> widgets = [
    WelliumWidget(
      name: '',
      description: '',
      widgetAspectRatio: 0.5 / 3.0,
      isHeader: false,
      content: WidgetContent.text,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final windowAspectRatio = size.width / size.height;
    final totalWidgets = widgets.length;

    return Scaffold(
      body: Stack(
        children: [
          _buildWidgetGrid(windowAspectRatio, totalWidgets),
          if (selectedWidget != null) _buildModal(),
        ],
      ),
    );
  }

  Widget _buildWidgetGrid(double windowAspectRatio, int totalWidgets) {
    if (windowAspectRatio > (totalWidgets.clamp(12, 24) * -0.0558 + 2.0)) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: widgets
              .map((w) => WidgetTile(
                    welliumWidget: w,
                    onSelect: _handleWidgetSelect,
                  ))
              .toList(),
        ),
      );
    }

    return SingleChildScrollView(
      child: Column(
        children: widgets
            .map((w) => WidgetTile(
                  welliumWidget: w,
                  onSelect: _handleWidgetSelect,
                ))
            .toList(),
      ),
    );
  }

  void _handleWidgetSelect(WelliumWidget widget) {
    if (!widget.isHeader && widget.name.isNotEmpty) {
      setState(() {
        selectedWidget = widget;
      });
    }
  }

  Widget _buildModal() {
    return ModalOverlay(
      welliumWidget: selectedWidget!,
      onClose: () => setState(() => selectedWidget = null),
    );
  }
}
