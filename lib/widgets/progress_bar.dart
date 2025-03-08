import 'package:flutter/material.dart';

class ProgressBar extends StatelessWidget {
  final double percent;
  final double height;
  final Color backgroundColor;
  final Color progressColor;

  const ProgressBar({
    Key? key, 
    required this.percent,
    this.height = 10.0,
    this.backgroundColor = Colors.white,
    this.progressColor = Colors.blue,
  }) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final containerWidth = constraints.maxWidth;
        final normalizedHeight = height > 0 ? height : containerWidth * 0.025;
        final normalized = percent.clamp(0, 100);
        final radius = normalizedHeight / 2; // Perfect radius for fully rounded corners
        
        return Container(
          height: normalizedHeight,
          width: double.infinity,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(radius),
          ),
          child: FractionallySizedBox(
            widthFactor: normalized / 100,
            alignment: Alignment.centerLeft,
            child: Container(
              decoration: BoxDecoration(
                color: progressColor,
                borderRadius: BorderRadius.circular(radius),
              ),
            ),
          ),
        );
      }
    );
  }
}