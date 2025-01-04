import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../models/widget_entry.dart';

class InputBlock extends StatefulWidget {
  final String widgetId;

  const InputBlock({super.key, required this.widgetId});

  @override
  State<InputBlock> createState() => _InputBlockState();
}

class _InputBlockState extends State<InputBlock> {
  final _controller = TextEditingController();
  late Box<WidgetEntry> _box;

  @override
  void initState() {
    super.initState();
    _box = Hive.box<WidgetEntry>('entries');
  }

  List<WidgetEntry> _getEntries() {
    return _box.values
        .where((entry) => entry.widgetId == widget.widgetId)
        .toList();
  }

  Future<void> _addEntry(String content) async {
    final entry = WidgetEntry(
      widgetId: widget.widgetId,
      content: content,
    );

    await _box.add(entry);
    setState(() {});
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final entries = _getEntries();

    return Column(
      children: [
        TextField(
          controller: _controller,
          decoration: const InputDecoration(
            hintText: 'Type something...',
          ),
          onSubmitted: _addEntry,
        ),
        Expanded(
          child: ListView.builder(
            itemCount: entries.length,
            itemBuilder: (context, index) {
              return Text(entries[index].content);
            },
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
