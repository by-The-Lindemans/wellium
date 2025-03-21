import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/db_provider.dart';
import '../widgets/input_block.dart';
import '../widgets/labeled_progress_bar.dart';
import '../widgets/text_block.dart';

final widgetsDataProvider = Provider<List<WidgetData>>((ref) {
  return [
    WidgetData(
      name: "Health",
      description: "",
      isHeader: true,
      content: () => TextBlock(text: "welliuᴍ"),
      aspectRatio: 16.0,
    ),
    WidgetData(
      name: "Text Widget",
      description: "This is the description for Widget 2.",
      isHeader: false,
      content: () => TextBlock(text: "Sample text for Widget 2."),
      aspectRatio: 3.0,
    ),
    WidgetData(
      name: "Input Widget",
      description: "This is the query for Widget 7.",
      isHeader: false,
      content: () =>
          InputBlock(widgetId: "widget-7", placeholder: "Type something..."),
      aspectRatio: 1.0,
    ),
    WidgetData(
      name: "Progress Widget",
      description: "This is the description for Widget 8.",
      isHeader: false,
      content: () => LabeledProgressBar(numerator: 20, denominator: 100),
      aspectRatio: 2,
    ),
  ];
});

class HomeScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Access your database if needed
    final db = ref.watch(dbProvider);
    
    // Access your widgets data
    final widgetsData = ref.watch(widgetsDataProvider);
    
    // Get sizing information
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final containerWidth = screenWidth * 0.9;
    final fontSize = screenWidth * 0.05;
    final descriptionSize = screenWidth * 0.035;
    final containerPadding = screenWidth * 0.03;
    final marginBottom = screenWidth * 0.03;
    
    return Theme(
      data: Theme.of(context).copyWith(
        appBarTheme: Theme.of(context).appBarTheme.copyWith(
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
          scrolledUnderElevation: 0,
          elevation: 0,
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          centerTitle: true,
          title: Text(
            'welliuᴍ',
            style: TextStyle(
              fontFamily: 'CodeNewRoman',
              fontSize: screenWidth * 0.06,
              fontWeight: FontWeight.bold,
              color: Color(0xFF7F7F7F),
            ),
          ),
        ),
        body: LayoutBuilder(
          builder: (context, constraints) {
            return ListView.builder(
              padding: EdgeInsets.all(containerPadding),
              itemCount: widgetsData.length,
              itemBuilder: (context, index) {
                final widgetData = widgetsData[index];
                
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
                    child: Column(
                      children: [
                        Padding(
                          padding: EdgeInsets.all(containerWidth * 0.02),
                          child: Text(
                            widgetData.name,
                            style: TextStyle(
                              fontSize: fontSize,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        
                        if (widgetData.isHeader) 
                          SizedBox(
                            width: containerWidth,
                            height: containerWidth / widgetData.aspectRatio,
                          )
                        else 
                          SizedBox(
                            width: containerWidth,
                            height: containerWidth / widgetData.aspectRatio,
                            child: ClipRect(
                              child: widgetData.content(),
                            ),
                          ),
                        
                        if (!widgetData.isHeader)
                          Padding(
                            padding: EdgeInsets.all(containerWidth * 0.02),
                            child: Text(
                              widgetData.description,
                              style: TextStyle(
                                fontSize: descriptionSize,
                                color: Colors.white70,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
  
  void _showWidgetModal(BuildContext context, WidgetData widgetData) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withOpacity(0.7),
      builder: (BuildContext context) {
        return GestureDetector(
          onTap: () {}, // Prevents taps from passing through
          child: Container(
            height: screenHeight * 2/3,
            width: screenWidth,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(15),
                topRight: Radius.circular(15),
              ),
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
                width: 1,
              ),
            ),
            padding: EdgeInsets.all(screenWidth * 0.05),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Widget title
                Text(
                  widgetData.name,
                  style: TextStyle(
                    fontSize: screenWidth * 0.06,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: screenHeight * 0.02),
                
                // Widget description
                Text(
                  widgetData.description,
                  style: TextStyle(
                    fontSize: screenWidth * 0.04,
                    color: Colors.white70,
                  ),
                ),
                SizedBox(height: screenHeight * 0.03),
                
                // Widget content with proper aspect ratio
                Expanded(
                  child: Center(
                    child: AspectRatio(
                      aspectRatio: widgetData.aspectRatio,
                      child: widgetData.content(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class WidgetData {
  final String name;
  final String description;
  final bool isHeader;
  final Function content;
  final double aspectRatio;
  
  WidgetData({
    required this.name,
    required this.description,
    required this.isHeader,
    required this.content,
    required this.aspectRatio,
  });
}