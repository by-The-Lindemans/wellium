import 'package:flutter/material.dart';

import '../data/db_connection.dart';
import '../models/widget_entry.dart';

class InputBlock extends StatefulWidget {
  final String widgetId;
  final String placeholder;

  const InputBlock({
    Key? key,
    required this.widgetId,
    required this.placeholder,
  }) : super(key: key);

  @override
  _InputBlockState createState() => _InputBlockState();
}

class _InputBlockState extends State<InputBlock> {
  final TextEditingController _controller = TextEditingController();
  List<WidgetEntry> _history = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final entries = await DbConnection.instance.getEntries(widget.widgetId);
    setState(() {
      _history = entries;
    });
  }

  Future<void> _handleSubmit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final entry = await DbConnection.instance.addEntry(widget.widgetId, text);
    setState(() {
      _history.insert(0, entry);
      _controller.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.black, // Background color for the block
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Constrain the width of the TextField
          SizedBox(
            width: double.infinity,
            // Ensures the TextField respects parent width
            child: TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: widget.placeholder,
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                filled: true,
                fillColor: Colors.white.withOpacity(0.15),
                // Faded background style
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10), // Rounded corners
                  borderSide: BorderSide.none, // No border outline
                ),
                contentPadding: const EdgeInsets.all(16), // Internal padding
              ),
              style: const TextStyle(color: Colors.white), // Text color
              onSubmitted: (_) => _handleSubmit(),
            ),
          ),
          const SizedBox(height: 16), // Space between input and history
          Expanded(
            child: _history.isEmpty
                ? const Center(child: Text("No entries yet"))
                : ListView.builder(
                    itemCount: _history.length,
                    itemBuilder: (context, index) {
                      final entry = _history[index];
                      return Card(
                        color: Colors.white.withOpacity(0.15),
                        // History entry color
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        // Space between entries
                        child: Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(
                            entry.content,
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
