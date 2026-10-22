import { type ReactNode } from "react";
import { Pagination, Table } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { useIsMobile } from "../../lib/hooks";
import { ListSkeleton } from "./index";

export interface SortState {
  field?: string;
  order?: "asc" | "desc";
}

/**
 * Liste responsive : tableau sur ordinateur, cartes empilées sur mobile.
 * Gère le chargement (squelette), l'état vide, la pagination et le tri serveur.
 */
export function DataList<T extends { id: string }>(props: {
  rows: T[];
  columns: ColumnsType<T>;
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPage?: (p: number) => void;
  onSort?: (s: SortState) => void;
  onRowClick?: (row: T) => void;
  mobileRender: (row: T) => ReactNode;
  empty: ReactNode;
  footer?: ReactNode;
  rowClassName?: (row: T) => string;
}) {
  const isMobile = useIsMobile();
  const { rows, loading, total = rows.length, page = 1, pageSize = 20 } = props;

  if (loading && rows.length === 0) return <ListSkeleton />;
  if (!loading && rows.length === 0) return <>{props.empty}</>;

  const pager =
    total > pageSize ? (
      <Pagination
        size="small"
        simple={isMobile}
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger={false}
        onChange={(p) => props.onPage?.(p)}
      />
    ) : null;

  if (isMobile) {
    return (
      <>
        <div className="m-list">
          {rows.map((r) => (
            <button type="button" key={r.id} className="m-item" onClick={() => props.onRowClick?.(r)}>
              {props.mobileRender(r)}
            </button>
          ))}
        </div>
        <div className="table-foot">
          <span>{total} élément{total > 1 ? "s" : ""}</span>
          {pager}
        </div>
      </>
    );
  }

  const onChange: TableProps<T>["onChange"] = (_p, _f, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    props.onSort?.({
      field: s?.order ? String(s.field ?? s.columnKey) : undefined,
      order: s?.order === "ascend" ? "asc" : s?.order === "descend" ? "desc" : undefined,
    });
  };

  return (
    <>
      <Table<T>
        rowKey="id"
        size="middle"
        columns={props.columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        onChange={onChange}
        scroll={{ x: "max-content" }}
        rowClassName={(r) => `${props.onRowClick ? "clickable" : ""} ${props.rowClassName?.(r) ?? ""}`}
        onRow={(r) => ({
          onClick: (e) => {
            // Ne pas déclencher la navigation quand on clique un contrôle dans la ligne.
            if ((e.target as HTMLElement).closest("button, a, .ant-select, input, .ant-dropdown-trigger")) return;
            props.onRowClick?.(r);
          },
        })}
      />
      <div className="table-foot">
        <span>
          {total} élément{total > 1 ? "s" : ""}
          {props.footer}
        </span>
        {pager}
      </div>
    </>
  );
}
