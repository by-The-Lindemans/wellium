import 'package:flutter/material.dart';

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
    this.historyLimit = 4,
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
        final itemHeight = constraints.maxWidth * 0.04;
        final textSize = itemHeight * 0.35;  // Reduced from 0.5 to 0.35        
        return Container(
          padding: const EdgeInsets.all(16),
          color: Colors.black,
          child: Column(
            children: [
              SizedBox(
                height: itemHeight,
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
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.15),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  ),
                  onSubmitted: (_) => _handleSubmit(),
                ),
              ),
              const SizedBox(height: 16),
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
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            alignment: Alignment.centerLeft,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
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
  }
}