import 'package:flutter/material.dart';


import '../data/db_connection.dart';
import '../models/widget_entry.dart';

// Add this class for state notification
class InputBlockNotifier extends ChangeNotifier {
  static final InputBlockNotifier _instance = InputBlockNotifier._internal();
  
  factory InputBlockNotifier() => _instance;
  
  InputBlockNotifier._internal();
  
  void notifyEntryAdded(String widgetId) {
    notifyListeners();
  }
}

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
    
    // Listen for changes from other InputBlock instances
    InputBlockNotifier().addListener(_onEntryChanged);
  }
  
  @override
  void dispose() {
    InputBlockNotifier().removeListener(_onEntryChanged);
    _controller.dispose();
    super.dispose();
  }
  
  void _onEntryChanged() {
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final entries = await DbConnection.instance.getEntries(widget.widgetId);



    if (mounted) {
      setState(() {
        _entries = entries.take(widget.historyLimit).toList();
      });
    }
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
    
    // Notify other instances
    InputBlockNotifier().notifyEntryAdded(widget.widgetId);
  }
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final containerWidth = constraints.maxWidth;
      
        // Scale all measurements based on container width
        final itemHeight = containerWidth * 0.075;
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

              Container(
                height: itemHeight,

                decoration: BoxDecoration(
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


                    filled: false,
                    fillColor: Colors.transparent,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(containerWidth * 0.05),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: horizontalItemPadding,

                      vertical: verticalItemPadding,
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

                              borderRadius: BorderRadius.circular(containerWidth * 0.05),
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