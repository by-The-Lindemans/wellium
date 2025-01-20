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

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text('${percent.round()}%'),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0),
          child: ProgressBar(percent: percent),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('0'),
            Text('$numerator'),
            Text('$denominator'),
          ],
        )
      ],
    );
  }
}
