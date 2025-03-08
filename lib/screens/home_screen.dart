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
      name: "Health",
      description: "",
      aspectRatio: 0.1,
      isHeader: true,
      content: () => TextBlock(text: "welliuᴍ"),
    ),
    MyWidgetData(
      name: "Text Widget",
      description: "This is the description for Widget 2.",
      aspectRatio: 0.3,
      isHeader: false,
      content: () => TextBlock(text: "Sample text for Widget 2."),
    ),
    MyWidgetData(
      name: "Input Widget",
      description: "This is the query for Widget 7.",
      aspectRatio: 1,
      isHeader: false,
      content: () =>
          InputBlock(widgetId: "widget-7", placeholder: "Type something..."),
    ),
    MyWidgetData(
      name: "Progress Widget",
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
        title: Text(
          'welliuᴍ',
          style: TextStyle(
            fontFamily: 'CodeNewRoman',
            fontSize: MediaQuery.of(context).size.width * 0.06,
            fontWeight: FontWeight.bold,
            color: Color(0xFF7F7F7F),
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.black,
        scrolledUnderElevation: 0,
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final containerWidth = constraints.maxWidth;
          final containerPadding = containerWidth * 0.02;

          return ListView.builder(
            padding: EdgeInsets.all(containerPadding),
            itemCount: widgetsData.length,
            itemBuilder: (context, index) {
              final widgetData = widgetsData[index];
              final referenceHeight = containerWidth * widgetData.aspectRatio;
              final fontSize = widgetData.isHeader ? 
                  containerWidth * 0.07 : containerWidth * 0.045;
              final descriptionSize = containerWidth * 0.035;
              final marginBottom = containerWidth * 0.02;

              return GestureDetector(
                onTap: () {
                  if (!widgetData.isHeader) {
                    _showWidgetModal(context, widgetData);
                  }
                },
                child: Container(
                  width: containerWidth,
                  margin: EdgeInsets.only(bottom: marginBottom),
                  decoration: BoxDecoration(
                    color: widgetData.isHeader ? Colors.transparent : Colors.black,
                    boxShadow: widgetData.isHeader ? [] : [
                      BoxShadow(
                        color: Colors.white.withOpacity(0.5),
                        blurRadius: containerWidth * 0.01,
                        spreadRadius: containerWidth * 0.0025,
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: containerWidth * 0.03),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: containerWidth * 0.01,
                            horizontal: containerWidth * 0.02,
                          ),
                          child: Text(
                            widgetData.name,
                            style: TextStyle(
                              fontSize: fontSize,
                              color: Colors.white,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        if (!widgetData.isHeader) ...[
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              maxHeight: referenceHeight * 0.65,
                              minHeight: referenceHeight * 0.3,
                            ),
                            child: widgetData.content(),
                          ),
                          Padding(
                            padding: EdgeInsets.fromLTRB(
                              containerWidth * 0.04,
                              containerWidth * 0.02,
                              containerWidth * 0.04,
                              containerWidth * 0.01,
                            ),
                            child: Text(
                              widgetData.description,
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: descriptionSize,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
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
    final screenWidth = MediaQuery.of(context).size.width;
  
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black, // Set background color for entire modal
      constraints: BoxConstraints(
        maxWidth: screenWidth,
      ),
      builder: (ctx) {
        return SizedBox(
          width: screenWidth,
          height: MediaQuery.of(context).size.height * 0.66,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Custom App Bar - matches the widget styling exactly
              Container(
                height: screenWidth * 0.15, // Proportional height
                color: Colors.black45,
                padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.04),
                child: Row(
                  children: [
                    // Close button
                    GestureDetector(
                      onTap: () => Navigator.of(ctx).pop(),
                      child: Icon(
                        Icons.close,
                        color: Colors.white,
                        size: screenWidth * 0.06,
                      ),
                    ),
                    SizedBox(width: screenWidth * 0.04),
                    // Title with EXACT same styling as widget title
                    Text(
                      widgetData.name,
                      style: TextStyle(
                        fontSize: widgetData.isHeader ? screenWidth * 0.07 : screenWidth * 0.045,
                        color: Colors.white,
                        // If you have other specific text styles in your app, add them here
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SizedBox(
                  width: double.infinity,
                  child: widgetData.content(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }}
