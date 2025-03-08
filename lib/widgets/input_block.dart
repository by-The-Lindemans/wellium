import 'package:flutter/material.dart';
import 'dart:math' as math;

import '../data/db_connection.dart';
import '../models/widget_entry.dart';

class InputBlock extends StatefulWidget {
  final String widgetId;
  final String placeholder;
  final int historyLimit;

  const InputBlock({
    Key? key,
    required this.widgetId,
    required this.placeholder,
    this.historyLimit = 5,
  }) : super(key: key);

  @override
  State<InputBlock> createState() => _InputBlockState();
}

class _InputBlockState extends State<InputBlock> {
  final TextEditingController _controller = TextEditingController();
  List<WidgetEntry> _entries = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final entries = await DbConnection.instance.getEntries(widget.widgetId);
    setState(() {
      _entries = entries.take(widget.historyLimit).toList();
    });
  }

  Future<void> _handleSubmit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final entry = await DbConnection.instance.addEntry(widget.widgetId, text);
    setState(() {
      _entries.insert(0, entry);
      if (_entries.length > widget.historyLimit) {
        _entries = _entries.take(widget.historyLimit).toList();
      }
      _controller.clear();
    });
  }
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final containerWidth = constraints.maxWidth;

      
        // Scale all measurements based on container width


        final itemHeight = containerWidth * 0.075; // Increase this from 0.04 to 0.075 for both
        final textSize = itemHeight * 0.35;
      
        // Scale padding and margins proportionally
        final containerPadding = containerWidth * 0.04;
        final horizontalItemPadding = containerWidth * 0.05;
        final verticalItemPadding = containerWidth * 0.02;
        final itemMargin = containerWidth * 0.01;
        final spaceBetweenElements = containerWidth * 0.04;
        







        return Container(
          padding: EdgeInsets.all(containerPadding),
          color: Colors.black,
          child: Column(
            children: [

              Container( // Changed from SizedBox to Container
                height: itemHeight,
                decoration: BoxDecoration( // Add decoration here to match list items
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(containerWidth * 0.05),
                ),
                child: TextField(
                  controller: _controller,
                  maxLines: 1,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: textSize,
                  ),
                  decoration: InputDecoration(
                    hintText: widget.placeholder,
                    hintStyle: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: textSize,
                    ),


                    filled: false, // Changed from true to false since container has color
                    fillColor: Colors.transparent, // Changed fill color
                    border: OutlineInputBorder(

                      borderRadius: BorderRadius.circular(containerWidth * 0.05),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: EdgeInsets.symmetric(


                      horizontal: horizontalItemPadding,
                      vertical: verticalItemPadding, // Use same padding as list items
                    ),
                  ),
                  onSubmitted: (_) => _handleSubmit(),
                ),
              ),
              SizedBox(height: spaceBetweenElements),
              Expanded(
                child: _entries.isEmpty
                    ? const Center(
                        child: Text(
                          "No entries yet",
                          style: TextStyle(color: Colors.white),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const ClampingScrollPhysics(),
                        itemCount: _entries.length,
                        itemBuilder: (context, index) {
                          final entry = _entries[index];
                          return Container(
                            height: itemHeight,
                            margin: EdgeInsets.symmetric(vertical: itemMargin),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(containerWidth * 0.05), // Scale border radius
                            ),
                            alignment: Alignment.centerLeft,
                            child: Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: horizontalItemPadding,
                                vertical: verticalItemPadding,
                              ),
                              child: Text(
                                entry.content,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: textSize,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );

  }  }