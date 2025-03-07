import 'package:flutter/material.dart';

import 'progress_bar.dart';

class LabeledProgressBar extends StatelessWidget {
  final int numerator;
  final int denominator;

  const LabeledProgressBar({
    Key? key,
    required this.numerator,
    required this.denominator,
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
            '${(numerator / denominator * 100).toInt()}%',
            style: const TextStyle(color: Colors.white),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(9),
              child: LinearProgressIndicator(
                value: numerator / denominator,
                backgroundColor: Colors.black,
                valueColor: const AlwaysStoppedAnimation<Color>(Colors.blue),
                minHeight: 20,
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
