import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/db_connection.dart';

class InputBlock extends ConsumerStatefulWidget {
  final String widgetId;
  final String placeholder;
  
  const InputBlock({
    Key? key, 
    required this.widgetId,
    required this.placeholder,
  }) : super(key: key);
  
  @override
  ConsumerState<InputBlock> createState() => _InputBlockState();
}

class _InputBlockState extends ConsumerState<InputBlock> {
  final TextEditingController _controller = TextEditingController();
  List<Map<String, dynamic>> _history = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final entries = await DbConnection.instance.getEntries();
      setState(() {
        _history = entries;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading history: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_controller.text.isEmpty) return;
    
    final text = _controller.text;
    _controller.clear();
    
    try {
      await DbConnection.instance.addEntry(text);
      await _loadHistory();
    } catch (e) {
      print('Error adding entry: $e');
    }
  }
  
  // Helper method to format timestamps
  String _formatTimestamp(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inDays == 0) {
      // Today, show time
      return 'Today at ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } else if (diff.inDays == 1) {
      return 'Yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else {
      // More than a week ago, show date
      return '${date.month}/${date.day}/${date.year}';
    }
  }

  @override
  Widget build(BuildContext context) {
    // Get screen dimensions for relative sizing
    final size = MediaQuery.of(context).size;
    final width = size.width;
    final height = size.height;
    
    // Calculate responsive sizes - scaled down by approximately half
    final fontSize = width * 0.02; // 2% of screen width (half of original 4%)
    final smallFontSize = fontSize * 0.75;
    final verticalPadding = height * 0.008; // 0.8% of screen height
    final horizontalPadding = width * 0.02; // 2% of screen width
    final borderRadius = width * 0.01; // 1% of screen width
    final itemSpacing = height * 0.005; // 0.5% of screen height
    
    // Sort history so newest entries are first
    final sortedHistory = List<Map<String, dynamic>>.from(_history)
      ..sort((a, b) => (b['timestamp'] ?? 0).compareTo(a['timestamp'] ?? 0));

































    @override
    Widget build(BuildContext context) {
      // Get screen dimensions for relative sizing
      final size = MediaQuery.of(context).size;
      final width = size.width;
      final height = size.height;
  
      // Calculate responsive sizes - optimized for density
      final fontSize = width * 0.018; // Even smaller font (1.8% of width)
      final smallFontSize = fontSize * 0.7; // Smaller timestamp text
      final verticalPadding = height * 0.006; // Reduced vertical padding
      final horizontalPadding = width * 0.015; // Reduced horizontal padding
      final borderRadius = width * 0.01;
      final itemSpacing = height * 0.003; // Minimal spacing between items
  
      // Sort history so newest entries are first
      final sortedHistory = List<Map<String, dynamic>>.from(_history)
        ..sort((a, b) => (b['timestamp'] ?? 0).compareTo(a['timestamp'] ?? 0));

      return LayoutBuilder(
        builder: (context, constraints) {
          // Calculate how many items to show based on available height
          // Use more aggressive space estimation:
          // - Use 95% of available height (increased from 80%)
          // - Estimate each item at 7% of screen height (reduced from 10%)
          // - Multiply by 2.0 to allow for even more items (increased from 1.5)
          int itemsToShow = (constraints.maxHeight * 0.95 / (height * 0.07) * 2.0).floor();
          itemsToShow = itemsToShow.clamp(3, 20); // Allow up to 20 items
      
          return Container(
            margin: EdgeInsets.symmetric(vertical: verticalPadding / 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Input Field - even more compact
                Container(
                  margin: EdgeInsets.only(bottom: itemSpacing * 2),
                  decoration: BoxDecoration(
                    color: Colors.grey[900],
                    borderRadius: BorderRadius.circular(borderRadius),
                  ),
                  child: TextField(
                    controller: _controller,
                    style: TextStyle(fontSize: fontSize),
                    decoration: InputDecoration(
                      hintText: widget.placeholder,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: horizontalPadding,
                        vertical: verticalPadding,
                      ),
                      border: InputBorder.none,
                      suffixIcon: IconButton(
                        iconSize: fontSize * 1.1,
                        icon: const Icon(Icons.send),
                        onPressed: _handleSubmit,
                        padding: EdgeInsets.all(horizontalPadding * 0.4),
                        constraints: const BoxConstraints(), // Remove minimum size constraints
                      ),
                      isDense: true, // Makes the input field more compact
                    ),








                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onEditingComplete: _handleSubmit,
                  ),



                ),

            
                // History items - ultra compact
                if (_isLoading)
                  Center(child: SizedBox(
                    width: fontSize * 1.2,
                    height: fontSize * 1.2,
                    child: CircularProgressIndicator(strokeWidth: fontSize * 0.1),
                  ))
                else
                  ...sortedHistory.take(itemsToShow).map((item) {
                    return Container(
                      margin: EdgeInsets.only(bottom: itemSpacing),
                      padding: EdgeInsets.symmetric(
                        horizontal: horizontalPadding * 0.7,
                        vertical: verticalPadding * 0.7,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey[900],
                        borderRadius: BorderRadius.circular(borderRadius),
                      ),
                      child: Row(  // Use Row for more compact layout
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Main text in expanded container
                          Expanded(
                            child: Text(
                              item['text'] ?? '',
                              style: TextStyle(fontSize: fontSize),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          // Timestamp as a suffix
                          if (item['timestamp'] != null)
                            Text(
                              " · " + _formatTimestamp(item['timestamp']),
                              style: TextStyle(
                                fontSize: smallFontSize,
                                color: Colors.grey[400],
                              ),
                            ),
                        ],
                      ),
                    );
                  }).toList(),
              ],
            ),
          );
        }
      );
    }              
              // History items below the input field - more compact
              if (_isLoading)
                Center(child: SizedBox(
                  width: fontSize * 1.5,
                  height: fontSize * 1.5,
                  child: CircularProgressIndicator(strokeWidth: fontSize * 0.1),
                ))
              else
                ...sortedHistory.take(itemsToShow).map((item) {
                  return Container(
                    margin: EdgeInsets.only(bottom: itemSpacing),
                    padding: EdgeInsets.symmetric(
                      horizontal: horizontalPadding * 0.8,
                      vertical: verticalPadding * 0.8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey[900],
                      borderRadius: BorderRadius.circular(borderRadius),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          item['text'] ?? '',
                          style: TextStyle(fontSize: fontSize),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (item['timestamp'] != null)
                          Padding(
                            padding: EdgeInsets.only(top: verticalPadding * 0.25),
                            child: Text(
                              _formatTimestamp(item['timestamp']),
                              style: TextStyle(
                                fontSize: smallFontSize,
                                color: Colors.grey[400],
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                }).toList(),
            ],
          ),
        );
      }
    );
  }
}