import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/db_connection.dart';

final dbProvider = Provider<DbConnection>((ref) {
  return DbConnection.instance;
});
