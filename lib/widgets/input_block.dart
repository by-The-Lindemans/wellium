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
    this.historyLimit = 2,
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

  Widget _buildEntryCard(WidgetEntry entry) {
    return Card(
      elevation: entry.isHeader ? 0 : 1,
      color: Colors.white.withOpacity(0.15),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      margin: const EdgeInsets.symmetric(vertical: 4),
      shadowColor: entry.isHeader ? Colors.transparent : Colors.white.withOpacity(0.5),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Text(
          entry.content,
          style: const TextStyle(color: Colors.white),
        ),
      ),
    );
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
    final maxHeight = MediaQuery.of(context).size.height * 0.8;

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: Container(
        padding: const EdgeInsets.all(16),
        color: Colors.black,
        child: Column(
          children: [
            TextField(
              controller: _controller,
              maxLines: 1,
              decoration: InputDecoration(
                hintText: widget.placeholder,
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                filled: true,
                fillColor: Colors.white.withOpacity(0.15),
                border: const OutlineInputBorder(
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.all(16),
              ),
              style: const TextStyle(color: Colors.white),
              onSubmitted: (_) => _handleSubmit(),
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
                        return Card(
                          color: Colors.white.withOpacity(0.15),
                          shape: const RoundedRectangleBorder(
                            borderRadius: BorderRadius.zero,
                          ),
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Text(
                              entry.content,
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                        );
                      },
                    )
            )
          ],
        ),
      ),
    );
  }
}
