import React from 'react';
import {
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

export interface AdminTableColumn<T> {
  key: string;
  title: string;
  flex?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  keyExtractor: (item: T, index: number) => string;
  rowStyle?: StyleProp<ViewStyle>;
  onRowPress?: (item: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPrevious: () => void;
    onNext: () => void;
  };
}

export default function AdminTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle,
  emptyDescription,
  keyExtractor,
  rowStyle,
  onRowPress,
  pagination,
}: AdminTableProps<T>) {
  if (loading) {
    return (
      <View style={styles.tableShell}>
        <LoadingSkeleton rows={6} />
      </View>
    );
  }

  if (!data.length) {
    return (
      <View style={styles.tableShell}>
        <EmptyState title={emptyTitle} description={emptyDescription} iconName="documents-outline" />
      </View>
    );
  }

  return (
    <View style={styles.tableShell}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableContent}>
          <View style={styles.headerRow}>
            {columns.map((column) => (
              <View
                key={column.key}
                style={[
                  styles.cell,
                  {
                    flex: column.flex ?? 1,
                    minWidth: column.minWidth ?? 120,
                    alignItems: column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <Text style={styles.headerText}>{column.title}</Text>
              </View>
            ))}
          </View>

          {data.map((item, index) => {
            const row = (
              <View key={keyExtractor(item, index)} style={[styles.dataRow, rowStyle]}>
                {columns.map((column) => (
                  <View
                    key={`${column.key}-${index}`}
                    style={[
                      styles.cell,
                      {
                        flex: column.flex ?? 1,
                        minWidth: column.minWidth ?? 120,
                        alignItems: column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start',
                      },
                    ]}
                  >
                    {column.render(item, index)}
                  </View>
                ))}
              </View>
            );

            if (onRowPress) {
              return (
                <TouchableOpacity key={keyExtractor(item, index)} activeOpacity={0.9} onPress={() => onRowPress(item)}>
                  {row}
                </TouchableOpacity>
              );
            }

            return row;
          })}
        </View>
      </ScrollView>

      {pagination ? (
        <View style={styles.paginationWrap}>
          <TouchableOpacity
            style={[styles.pageButton, pagination.currentPage <= 1 && styles.pageButtonDisabled]}
            onPress={pagination.onPrevious}
            disabled={pagination.currentPage <= 1}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageText}>
            Page {pagination.currentPage} of {Math.max(pagination.totalPages, 1)}
          </Text>
          <TouchableOpacity
            style={[
              styles.pageButton,
              pagination.currentPage >= pagination.totalPages && styles.pageButtonDisabled,
            ]}
            onPress={pagination.onNext}
            disabled={pagination.currentPage >= pagination.totalPages}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tableShell: {
    backgroundColor: '#011f36',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 134, 147, 0.28)',
    padding: 12,
    overflow: 'hidden',
  },
  tableContent: {
    minWidth: 780,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 153, 166, 0.35)',
    paddingBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 153, 166, 0.15)',
    minHeight: 62,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  headerText: {
    color: '#9fb5c0',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  paginationWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  pageButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38a6de',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(56, 166, 222, 0.12)',
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    color: '#d6efff',
    fontSize: 12,
    fontWeight: '600',
  },
  pageText: {
    color: '#9fb5c0',
    fontSize: 12,
    fontWeight: '600',
  },
});
