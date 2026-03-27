import { FormEvent, useEffect, useState } from "react";
import { setAuthContext } from "../api/client";
import {
  changeTicketStatus,
  createTicket,
  getTicketDetail,
  listTicketsWithFilters,
  Status,
  Ticket,
  TicketDetail
} from "../api/tickets";
import { getResolutionSummary } from "../api/stats";

type Role = "ADMIN" | "AGENT" | "REQUESTER";
const STATUS_OPTIONS: Array<Status | "ALL"> = ["ALL", "RECEIVED", "IN_PROGRESS", "DONE"];

export function DashboardPage() {
  const [role, setRole] = useState<Role>("ADMIN");
  const [userName, setUserName] = useState("demo-admin");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status | "ALL">("ALL");
  const [filterRequesterName, setFilterRequesterName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [averageMinutes, setAverageMinutes] = useState(0);
  const [medianMinutes, setMedianMinutes] = useState(0);
  const [dailyCompleted, setDailyCompleted] = useState<Array<{ date: string; count: number }>>(
    []
  );
  const [message, setMessage] = useState("");

  const [requesterName, setRequesterName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actorName, setActorName] = useState("");
  const [toStatus, setToStatus] = useState<Status>("IN_PROGRESS");
  const [note, setNote] = useState("");

  async function refreshList() {
    const status = selectedStatus === "ALL" ? undefined : selectedStatus;
    const data = await listTicketsWithFilters({
      status,
      requesterName: filterRequesterName || undefined,
      q: keyword || undefined
    });
    setTickets(data);
  }

  async function refreshStats() {
    const stats = await getResolutionSummary();
    setCompletedCount(stats.completedCount);
    setAverageMinutes(stats.averageResolutionMinutes);
    setMedianMinutes(stats.medianResolutionMinutes);
    setDailyCompleted(stats.dailyCompleted);
  }

  async function refreshDetail(ticketId: string) {
    const data = await getTicketDetail(ticketId);
    setDetail(data);
  }

  async function loadAll() {
    setMessage("");
    await Promise.all([refreshList(), refreshStats()]);
  }

  useEffect(() => {
    setAuthContext({ role, userName: userName || "anonymous" });
    setSelectedTicketId("");
    setDetail(null);
    setMessage("");
  }, [role, userName]);

  useEffect(() => {
    void loadAll();
  }, [selectedStatus, role, userName]);

  async function onSubmitCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await createTicket({
        requesterName,
        title,
        description
      });
      setRequesterName("");
      setTitle("");
      setDescription("");
      setMessage("티켓이 등록되었습니다.");
      await loadAll();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function onSubmitChangeStatus(e: FormEvent) {
    e.preventDefault();
    if (!selectedTicketId) {
      setMessage("상태 변경할 ticketId를 선택하세요.");
      return;
    }

    try {
      await changeTicketStatus({
        ticketId: selectedTicketId,
        toStatus,
        actorName,
        note: note || undefined
      });
      setMessage("상태가 변경되었습니다.");
      await loadAll();
      await refreshDetail(selectedTicketId);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  async function onClickDetail(ticketId: string) {
    setSelectedTicketId(ticketId);
    try {
      await refreshDetail(ticketId);
      setMessage("");
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="container">
      <h1>Helpdesk Dashboard</h1>
      <p className="desc">내부 업무용 티켓 관리 (MVP+)</p>

      <section className="card">
        <h2>사용자 컨텍스트</h2>
        <div className="inline">
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
      </section>

      <section className="card">
        <h2>통계</h2>
        <div>완료 건수: {completedCount}</div>
        <div>평균 처리시간(분): {averageMinutes.toFixed(2)}</div>
        <div>중앙값 처리시간(분): {medianMinutes.toFixed(2)}</div>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>완료 건수</th>
            </tr>
          </thead>
          <tbody>
            {dailyCompleted.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>티켓 등록</h2>
        <form onSubmit={onSubmitCreate} className="form">
          <label>
            요청자
            <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
          </label>
          <label>
            제목
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            내용
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <button type="submit">등록</button>
        </form>
      </section>

      <section className="card">
        <h2>티켓 목록</h2>
        <div className="inline">
          <label>
            상태 필터
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as Status | "ALL")}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            요청자 필터
            <input
              value={filterRequesterName}
              onChange={(e) => setFilterRequesterName(e.target.value)}
            />
          </label>
          <label>
            키워드(제목/내용)
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </label>
          <button type="button" onClick={() => void loadAll()}>
            조회
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>제목</th>
              <th>요청자</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.id}</td>
                <td>{ticket.title}</td>
                <td>{ticket.requesterName}</td>
                <td>{ticket.status}</td>
                <td>
                  <button type="button" onClick={() => void onClickDetail(ticket.id)}>
                    상세
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>상태 변경</h2>
        <form onSubmit={onSubmitChangeStatus} className="form">
          <label>
            ticketId
            <input value={selectedTicketId} onChange={(e) => setSelectedTicketId(e.target.value)} />
          </label>
          <label>
            처리자
            <input value={actorName} onChange={(e) => setActorName(e.target.value)} />
          </label>
          <label>
            변경 상태
            <select value={toStatus} onChange={(e) => setToStatus(e.target.value as Status)}>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
          </label>
          <label>
            메모
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit">상태 변경</button>
        </form>
      </section>

      <section className="card">
        <h2>티켓 상세/이력</h2>
        {!detail && <div>상세 조회할 티켓을 선택하세요.</div>}
        {detail && (
          <>
            <div>ID: {detail.id}</div>
            <div>제목: {detail.title}</div>
            <div>요청자: {detail.requesterName}</div>
            <div>상태: {detail.status}</div>
            <table>
              <thead>
                <tr>
                  <th>시각</th>
                  <th>이벤트</th>
                  <th>처리자</th>
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
                    <td>{history.fromStatus ?? "-"}</td>
                    <td>{history.toStatus ?? "-"}</td>
                    <td>{history.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {message && <div className="message">{message}</div>}
    </div>
  );
}
