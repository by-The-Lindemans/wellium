import 'package:flutter/material.dart';

import '../widgets/input_block.dart';
import '../widgets/labeled_progress_bar.dart';
import '../widgets/text_block.dart';

class MyWidgetData {
  final String name;
  final String description;
  final double aspectRatio;
  final bool isHeader;
  final Widget Function() content;

  MyWidgetData({
    required this.name,
    required this.description,
    required this.aspectRatio,
    required this.isHeader,
    required this.content,
  });
}

class HomeScreen extends StatelessWidget {
  HomeScreen({Key? key}) : super(key: key);

  final List<MyWidgetData> widgetsData = [
    MyWidgetData(
      name: "Title",
      description: "",
      aspectRatio: 0.2,
      isHeader: true,
      content: () => const TextBlock(text: "welliuᴍ"),
    ),
    MyWidgetData(
      name: "Widget 2",
      description: "This is the description for Widget 2.",
      aspectRatio: 0.3,
      isHeader: false,
      content: () => const TextBlock(text: "Sample text for Widget 2."),
    ),
    MyWidgetData(
      name: "Input Widget 7",
      description: "This is the query for Widget 7.",
      aspectRatio: 0.3,
      isHeader: false,
      content: () => const InputBlock(
        widgetId: "widget-7",
        placeholder: "Type something...",
      ),
    ),
    MyWidgetData(
      name: "Progress 20 of 100",
      description: "This is the description for Widget 8.",
      aspectRatio: 0.3,
      isHeader: false,
      content: () => const LabeledProgressBar(numerator: 20, denominator: 100),
    ),
    // Add more widgets as needed
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("welliuᴍ")),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final screenWidth = constraints.maxWidth;

          return SingleChildScrollView(
            child: Column(
              children: widgetsData.map((w) {
                final widgetHeight = screenWidth * w.aspectRatio;
                return GestureDetector(
                  onTap: () {
                    if (!w.isHeader) {
                      _showWidgetModal(context, w);
                    }
                  },
                  child: Container(
                    width: screenWidth,
                    height: widgetHeight,
                    margin: const EdgeInsets.only(bottom: 8.0),
                    decoration: BoxDecoration(
                      color: w.isHeader ? Colors.black26 : Colors.black,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.white.withOpacity(0.5), // drop-shadow
                          blurRadius: 4,
                          spreadRadius: 1,
                        ),
                      ],
                      borderRadius: BorderRadius.circular(
                          screenWidth * 0.1), // approximate 10vw
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          w.name,
                          style: TextStyle(
                            fontSize: w.isHeader ? 28 : 18,
                            color: Colors.white,
                          ),
                        ),
                        if (!w.isHeader) ...[
                          Expanded(child: w.content()),
                          Text(
                            w.description,
                            style: const TextStyle(color: Colors.white),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          );
        },
      ),
    );
  }

  void _showWidgetModal(BuildContext context, MyWidgetData widgetData) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          color: Colors.black87,
          height: MediaQuery.of(context).size.height * 0.66,
          child: Column(
            children: [
              AppBar(
                backgroundColor: Colors.black45,
                title: Text(widgetData.name),
                leading: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ),
              Expanded(child: widgetData.content()),
            ],
          ),
        );
      },
    );
  }
}
