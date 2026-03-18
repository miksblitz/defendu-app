import React from 'react';
import {
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
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
  sortable?: boolean;
  render: (item: T, index: number) => React.ReactNode;
}

export type TableSortDirection = 'asc' | 'desc';

export interface AdminTableSortState {
  columnKey: string;
  direction: TableSortDirection;
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  data: T[];
  loading?: boolean;
  compact?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  keyExtractor: (item: T, index: number) => string;
  rowStyle?: StyleProp<ViewStyle>;
  onRowPress?: (item: T) => void;
  sortState?: AdminTableSortState;
  onSortChange?: (columnKey: string) => void;
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
  compact,
  emptyTitle,
  emptyDescription,
  keyExtractor,
  rowStyle,
  onRowPress,
  sortState,
  onSortChange,
  pagination,
}: AdminTableProps<T>) {
  const { width } = useWindowDimensions();
  const isCompact = compact ?? width < 1080;

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
    <View style={[styles.tableShell, isCompact && styles.tableShellCompact]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.tableContent, isCompact && styles.tableContentCompact]}>
          <View style={styles.headerRow}>
            {columns.map((column) => (
              <View
                key={column.key}
                style={[
                  styles.cell,
                  isCompact && styles.cellCompact,
                  {
                    flex: column.flex ?? 1,
                    minWidth: column.minWidth ?? 120,
                    alignItems: column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                {column.sortable && onSortChange ? (
                  <TouchableOpacity
                    style={[styles.sortButton, isCompact && styles.sortButtonCompact]}
                    onPress={() => onSortChange(column.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.headerText, isCompact && styles.headerTextCompact]}>{column.title}</Text>
                    <Text style={styles.sortIcon}>
                      {sortState?.columnKey === column.key
                        ? (sortState.direction === 'asc' ? '▲' : '▼')
                        : '↕'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.headerText, isCompact && styles.headerTextCompact]}>{column.title}</Text>
                )}
              </View>
            ))}
          </View>

          {data.map((item, index) => {
            const isOddRow = index % 2 === 1;
            const row = (
              <View key={keyExtractor(item, index)} style={[styles.dataRow, isCompact && styles.dataRowCompact, isOddRow && styles.altRow, rowStyle]}>
                {columns.map((column) => (
                  <View
                    key={`${column.key}-${index}`}
                    style={[
                      styles.cell,
                      isCompact && styles.cellCompact,
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
        <View style={[styles.paginationWrap, isCompact && styles.paginationWrapCompact]}>
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(126, 153, 166, 0.32)',
    padding: 14,
    overflow: 'hidden',
  },
  tableShellCompact: {
    padding: 10,
  },
  tableContent: {
    minWidth: 780,
    width: '100%',
  },
  tableContentCompact: {
    minWidth: 680,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 153, 166, 0.4)',
    paddingBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(126, 153, 166, 0.15)',
    minHeight: 60,
    alignItems: 'center',
  },
  dataRowCompact: {
    minHeight: 52,
  },
  altRow: {
    backgroundColor: 'rgba(17, 42, 61, 0.32)',
  },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  cellCompact: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortButtonCompact: {
    gap: 4,
  },
  headerText: {
    color: '#a9c0cb',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  headerTextCompact: {
    fontSize: 11,
    letterSpacing: 0.45,
  },
  sortIcon: {
    color: '#67bce9',
    fontSize: 10,
    fontWeight: '700',
    marginTop: -1,
  },
  paginationWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  paginationWrapCompact: {
    justifyContent: 'space-between',
    gap: 8,
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
