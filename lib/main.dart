import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'data/hive_setup.dart';
import 'presentation/screens/home_screen.dart';
import 'presentation/themes/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await HiveSetup.init();

  await SentryFlutter.init(
    (options) {
      options.dsn =
          'https://c01d8dbaf6573ab856942e2288bd3f4f@o4508712697724928.ingest.de.sentry.io/4508712713322576';
      // Set other options as needed
    },
    appRunner: () => runApp(const ProviderScope(child: WelliumApp())),
  );
}

class WelliumApp extends StatelessWidget {
  const WelliumApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Wellium',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      home: const Scaffold(
        body: HomeScreen(),
      ),
      debugShowCheckedModeBanner: false,
    );
  }
}
