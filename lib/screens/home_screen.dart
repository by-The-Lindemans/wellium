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

  const MyWidgetData({
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
      content: () => TextBlock(text: "welliuᴍ"),
    ),
    MyWidgetData(
      name: "Widget 2",
      description: "This is the description for Widget 2.",
      aspectRatio: 0.3,
      isHeader: false,
      content: () => TextBlock(text: "Sample text for Widget 2."),
    ),
    MyWidgetData(
      name: "Input Widget 7",
      description: "This is the query for Widget 7.",
      aspectRatio: 0.3,
      isHeader: false,
      content: () => InputBlock(
        widgetId: "widget-7",
        placeholder: "Type something...",
      ),
    ),
    MyWidgetData(
      name: "Progress 20 of 100",
      description: "This is the description for Widget 8.",
      aspectRatio: 0.3,
      isHeader: false,
      content: () => LabeledProgressBar(numerator: 20, denominator: 100),
    ),
    // Add more widgets as needed
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Code New Roman Demo',
          style: TextStyle(
            fontFamily: 'CodeNewRoman', // Use Code New Roman for the title
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.black,
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final screenWidth = constraints.maxWidth;

          return ListView.builder(
            padding: const EdgeInsets.all(8.0),
            itemCount: widgetsData.length,
            itemBuilder: (context, index) {
              final widgetData = widgetsData[index];
              final widgetHeight = screenWidth * widgetData.aspectRatio;

              return GestureDetector(
                onTap: () {
                  if (!widgetData.isHeader) {
                    _showWidgetModal(context, widgetData);
                  }
                },
                child: Container(
                  width: screenWidth,
                  height: widgetHeight,
                  margin: const EdgeInsets.only(bottom: 8.0),
                  decoration: BoxDecoration(
                    color: widgetData.isHeader ? Colors.black26 : Colors.black,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.white.withOpacity(0.5), // drop-shadow
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                    // Removed borderRadius to eliminate rounded corners
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        widgetData.name,
                        style: TextStyle(
                          fontSize: widgetData.isHeader ? 28 : 18,
                          color: Colors.white,
                        ),
                      ),
                      if (!widgetData.isHeader) ...[
                        // Removed Expanded to avoid overflow if needed; adjust as necessary
                        widgetData.content(),
                        Text(
                          widgetData.description,
                          style: const TextStyle(color: Colors.white),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
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
