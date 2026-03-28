import { FormEvent, useEffect, useMemo, useState } from "react";
import { setAuthContext } from "../api/client";
import {
  addTicketComment,
  changeTicketStatus,
  createTicket,
  getTicketDetail,
  listTicketsWithFilters,
  Priority,
  Status,
  Ticket,
  TicketDetail
} from "../api/tickets";
import { getResolutionSummary } from "../api/stats";

type Role = "ADMIN" | "AGENT" | "REQUESTER";

const STATUS_LABEL: Record<Status, string> = {
  RECEIVED: "접수",
  IN_PROGRESS: "처리중",
  DONE: "완료"
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음"
};

export function DashboardPage() {
  const [role, setRole] = useState<Role>("ADMIN");
  const [userName, setUserName] = useState("admin1");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [message, setMessage] = useState("");

  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [createRequesterName, setCreateRequesterName] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPriority, setCreatePriority] = useState<Priority>("MEDIUM");
  const [createDueAt, setCreateDueAt] = useState("");

  const [changeActorName, setChangeActorName] = useState("");
  const [changeToStatus, setChangeToStatus] = useState<Status>("IN_PROGRESS");
  const [changeNote, setChangeNote] = useState("");

  const [commentActorName, setCommentActorName] = useState("");
  const [commentNote, setCommentNote] = useState("");

  const [summary, setSummary] = useState({
    completedCount: 0,
    averageResolutionMinutes: 0,
    medianResolutionMinutes: 0,
    slaOver24HoursCompletedCount: 0,
    statusCounts: {
      RECEIVED: 0,
      IN_PROGRESS: 0,
      DONE: 0
    },
    todayCompletedCount: 0,
    overdueCount: 0,
    dailyCompleted: [] as Array<{ date: string; count: number }>
  });

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  useEffect(() => {
    setAuthContext({ role, userName: userName || "anonymous" });
    setSelectedTicketId("");
    setDetail(null);
    setMessage("");
  }, [role, userName]);

  useEffect(() => {
    void refreshAll();
  }, [role, userName, statusFilter, priorityFilter, overdueOnly]);

  async function refreshAll() {
    try {
      setMessage("");
      const [ticketList, summaryData] = await Promise.all([
        listTicketsWithFilters({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          priority: priorityFilter === "ALL" ? undefined : priorityFilter,
          requesterName: requesterFilter || undefined,
          q: keywordFilter || undefined,
          overdueOnly
        }),
        getResolutionSummary()
      ]);
      setTickets(ticketList);
      setSummary(summaryData);
      if (selectedTicketId) {
        const updatedDetail = await getTicketDetail(selectedTicketId);
        setDetail(updatedDetail);
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function onCreateTicket(e: FormEvent) {
    e.preventDefault();
    try {
      await createTicket({
        requesterName: createRequesterName,
        title: createTitle,
        description: createDescription,
        priority: createPriority,
        dueAt: createDueAt ? new Date(createDueAt).toISOString() : undefined
      });
      setCreateRequesterName("");
      setCreateTitle("");
      setCreateDescription("");
      setCreatePriority("MEDIUM");
      setCreateDueAt("");
      setMessage("티켓이 등록되었습니다.");
      await refreshAll();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function onChangeStatus(e: FormEvent) {
    e.preventDefault();
    if (!selectedTicketId) {
      setMessage("먼저 티켓을 선택하세요.");
      return;
    }
    try {
      await changeTicketStatus({
        ticketId: selectedTicketId,
        toStatus: changeToStatus,
        actorName: changeActorName,
        note: changeNote || undefined
      });
      setChangeNote("");
      setMessage("상태가 변경되었습니다.");
      await refreshAll();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function onAddComment(e: FormEvent) {
    e.preventDefault();
    if (!selectedTicketId) {
      setMessage("먼저 티켓을 선택하세요.");
      return;
    }
    try {
      await addTicketComment({
        ticketId: selectedTicketId,
        actorName: commentActorName,
        note: commentNote
      });
      setCommentNote("");
      setMessage("코멘트가 등록되었습니다.");
      await refreshAll();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function onOpenDetail(ticketId: string) {
    try {
      setSelectedTicketId(ticketId);
      const data = await getTicketDetail(ticketId);
      setDetail(data);
      setMessage("");
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="container">
      <header className="hero">
        <h1>Helpdesk Dashboard</h1>
        <p>요청 접수부터 완료까지, 한 화면에서 쉽게 확인하고 처리하세요.</p>
      </header>

      <section className="panel">
        <h2>사용자 설정</h2>
        <div className="row">
          <label>
            역할
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="ADMIN">ADMIN</option>
              <option value="AGENT">AGENT</option>
              <option value="REQUESTER">REQUESTER</option>
            </select>
          </label>
          <label>
            사용자 이름
            <input value={userName} onChange={(e) => setUserName(e.target.value)} />
          </label>
        </div>
        <p className="hint">REQUESTER는 본인 티켓만 조회할 수 있고 상태 변경은 불가합니다.</p>
      </section>

      <section className="stats-grid">
        <article className="stat-card blue">
          <h3>완료 건수</h3>
          <strong>{summary.completedCount}</strong>
        </article>
        <article className="stat-card purple">
          <h3>오늘 완료</h3>
          <strong>{summary.todayCompletedCount}</strong>
        </article>
        <article className="stat-card green">
          <h3>평균 처리시간(분)</h3>
          <strong>{summary.averageResolutionMinutes.toFixed(1)}</strong>
        </article>
        <article className="stat-card orange">
          <h3>중앙값 처리시간(분)</h3>
          <strong>{summary.medianResolutionMinutes.toFixed(1)}</strong>
        </article>
        <article className="stat-card red">
          <h3>24시간 초과 완료</h3>
          <strong>{summary.slaOver24HoursCompletedCount}</strong>
        </article>
        <article className="stat-card gray">
          <h3>현재 지연 건수</h3>
          <strong>{summary.overdueCount}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>상태별 건수</h2>
        <div className="status-counts">
          <span>접수 {summary.statusCounts.RECEIVED}</span>
          <span>처리중 {summary.statusCounts.IN_PROGRESS}</span>
          <span>완료 {summary.statusCounts.DONE}</span>
        </div>
      </section>

      <section className="panel">
        <h2>티켓 등록</h2>
        <form className="form-grid" onSubmit={onCreateTicket}>
          <label>
            요청자
            <input
              value={createRequesterName}
              onChange={(e) => setCreateRequesterName(e.target.value)}
              placeholder="예: user1"
            />
          </label>
          <label>
            우선순위
            <select
              value={createPriority}
              onChange={(e) => setCreatePriority(e.target.value as Priority)}
            >
              <option value="LOW">낮음</option>
              <option value="MEDIUM">보통</option>
              <option value="HIGH">높음</option>
            </select>
          </label>
          <label>
            마감기한
            <input
              type="datetime-local"
              value={createDueAt}
              onChange={(e) => setCreateDueAt(e.target.value)}
            />
          </label>
          <label className="full">
            제목
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="예: VPN 접속 오류"
            />
          </label>
          <label className="full">
            내용
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              rows={3}
            />
          </label>
          <button
            type="submit"
            disabled={!createRequesterName || !createTitle || !createDescription}
          >
            티켓 등록
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>티켓 목록/검색</h2>
        <div className="row wrap">
          <label>
            상태
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | "ALL")}
            >
              <option value="ALL">전체</option>
              <option value="RECEIVED">접수</option>
              <option value="IN_PROGRESS">처리중</option>
              <option value="DONE">완료</option>
            </select>
          </label>
          <label>
            우선순위
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | "ALL")}
            >
              <option value="ALL">전체</option>
              <option value="LOW">낮음</option>
              <option value="MEDIUM">보통</option>
              <option value="HIGH">높음</option>
            </select>
          </label>
          <label>
            요청자
            <input value={requesterFilter} onChange={(e) => setRequesterFilter(e.target.value)} />
          </label>
          <label>
            키워드
            <input value={keywordFilter} onChange={(e) => setKeywordFilter(e.target.value)} />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            지연 건만 보기
          </label>
          <button type="button" onClick={() => void refreshAll()}>
            조회
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>티켓</th>
              <th>제목</th>
              <th>요청자</th>
              <th>우선순위</th>
              <th>상태</th>
              <th>기한</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7}>조건에 맞는 티켓이 없습니다.</td>
              </tr>
            )}
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.id.slice(0, 8)}</td>
                <td>{ticket.title}</td>
                <td>{ticket.requesterName}</td>
                <td>{PRIORITY_LABEL[ticket.priority]}</td>
                <td>{STATUS_LABEL[ticket.status]}</td>
                <td>{ticket.dueAt ? new Date(ticket.dueAt).toLocaleString() : "-"}</td>
                <td>
                  <button type="button" onClick={() => void onOpenDetail(ticket.id)}>
                    보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel two-col">
        <div>
          <h2>상태 변경</h2>
          <form className="form-grid" onSubmit={onChangeStatus}>
            <label>
              티켓
              <select
                value={selectedTicketId}
                onChange={(e) => setSelectedTicketId(e.target.value)}
              >
                <option value="">선택하세요</option>
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    [{ticket.id.slice(0, 8)}] {ticket.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              처리자
              <input
                value={changeActorName}
                onChange={(e) => setChangeActorName(e.target.value)}
                placeholder="예: agent1"
              />
            </label>
            <label>
              변경 상태
              <select
                value={changeToStatus}
                onChange={(e) => setChangeToStatus(e.target.value as Status)}
              >
                <option value="IN_PROGRESS">처리중</option>
                <option value="DONE">완료</option>
              </select>
            </label>
            <label>
              메모
              <input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
            </label>
            <button type="submit" disabled={!selectedTicketId || !changeActorName}>
              상태 변경 저장
            </button>
          </form>
        </div>

        <div>
          <h2>코멘트 추가</h2>
          <form className="form-grid" onSubmit={onAddComment}>
            <label>
              작성자
              <input
                value={commentActorName}
                onChange={(e) => setCommentActorName(e.target.value)}
                placeholder="예: agent1"
              />
            </label>
            <label>
              코멘트
              <textarea
                value={commentNote}
                onChange={(e) => setCommentNote(e.target.value)}
                rows={3}
              />
            </label>
            <button type="submit" disabled={!selectedTicketId || !commentActorName || !commentNote}>
              코멘트 등록
            </button>
          </form>
        </div>
      </section>

      <section className="panel">
        <h2>티켓 상세/이력</h2>
        {!detail && <p className="hint">목록에서 티켓을 선택하면 이력이 보입니다.</p>}
        {detail && (
          <>
            <div className="detail-summary">
              <span>티켓: {detail.id.slice(0, 8)}</span>
              <span>제목: {detail.title}</span>
              <span>요청자: {detail.requesterName}</span>
              <span>우선순위: {PRIORITY_LABEL[detail.priority]}</span>
              <span>상태: {STATUS_LABEL[detail.status]}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>시각</th>
                  <th>이벤트</th>
                  <th>작성자</th>
                  <th>from</th>
                  <th>to</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {detail.histories.map((history) => (
                  <tr key={history.id}>
                    <td>{new Date(history.createdAt).toLocaleString()}</td>
                    <td>{history.eventType}</td>
                    <td>{history.actorName}</td>
                    <td>{history.fromStatus ? STATUS_LABEL[history.fromStatus] : "-"}</td>
                    <td>{history.toStatus ? STATUS_LABEL[history.toStatus] : "-"}</td>
                    <td>{history.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {message && <div className="message">{message}</div>}
      {selectedTicket && <div className="footer-tip">선택된 티켓: {selectedTicket.title}</div>}
    </div>
  );
}
