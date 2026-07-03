import './board/theme.css';
import { BoardApp } from './board/BoardApp';
import { FeedbackApp } from './feedback/FeedbackApp';

export function App() {
  // Публичная ветка обращений (общая ссылка на форму + персональный трек) живёт мимо логина.
  if (window.location.pathname.startsWith('/feedback')) {
    return <FeedbackApp />;
  }
  return <BoardApp />;
}
