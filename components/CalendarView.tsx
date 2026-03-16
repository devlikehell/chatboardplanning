'use client';

import { useState } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/lib/store';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { boards } = useAppContext();

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = [];

  let day = startDate;
  let formattedDate = "";

  // Get all tasks with due dates
  const allTasks = boards.flatMap(board => 
    board.columns.flatMap(column => 
      column.tasks.filter(task => task.dueDate).map(task => ({
        ...task,
        boardName: board.name,
        columnName: column.title
      }))
    )
  );

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, "d");
      const cloneDay = day;
      
      const dayTasks = allTasks.filter(task => 
        task.dueDate && isSameDay(new Date(task.dueDate), cloneDay)
      );

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[120px] p-2 border border-zinc-800/50 ${
            !isSameMonth(day, monthStart)
              ? "bg-zinc-900/20 text-zinc-600"
              : isSameDay(day, new Date())
              ? "bg-indigo-900/10 text-indigo-400 font-bold"
              : "bg-zinc-900/50 text-zinc-300"
          }`}
        >
          <div className="flex justify-end">
            <span className={`h-8 w-8 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white' : ''}`}>
              {formattedDate}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {dayTasks.map(task => (
              <div key={task.id} className="text-xs p-1.5 rounded bg-zinc-800 border border-zinc-700 truncate cursor-pointer hover:bg-zinc-700 transition-colors" title={`${task.title} (${task.boardName})`}>
                <span className="w-2 h-2 inline-block rounded-full bg-indigo-500 mr-1.5"></span>
                {task.title}
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">Calendar</h2>
        <div className="flex items-center gap-4 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
          <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium text-white min-w-[150px] text-center">
            {format(currentDate, dateFormat)}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/80">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div key={dayName} className="py-3 text-center text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-zinc-950">
          {days}
        </div>
      </div>
    </div>
  );
}
