import 'package:flutter/material.dart';

// Make sure this import path is correct - it might need to be a package import instead
import 'progress_bar.dart';  // or use the full package path if needed
class LabeledProgressBar extends StatelessWidget {
  final int numerator;
  final int denominator;
  final double height;

  const LabeledProgressBar({
    Key? key,
    required this.numerator,
    required this.denominator,
    this.height = 20.0,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final double percent =
        denominator == 0 ? 0 : (numerator / denominator) * 100;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '${percent.toInt()}%',
            style: const TextStyle(color: Colors.white),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(height / 2 + 2), // +2 to account for border width
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular((height / 2) + 1),  // Slightly smaller to fit inside border
              child: ProgressBar(
                percent: percent,
                height: height,
                backgroundColor: Colors.white,
                progressColor: Colors.blue,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('0', style: const TextStyle(color: Colors.white)),
              Text('$denominator', style: const TextStyle(color: Colors.white)),
            ],
          ),
        ],
      ),
    );
  }
}
