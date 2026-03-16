'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Settings, X, GripVertical, Users, Check } from 'lucide-react';
import { useAppContext, Board, Column, Task } from '@/lib/store';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';

export function BoardsView({ onSpawnRoom }: { onSpawnRoom: (room: string) => void }) {
  const { boards, createBoard, updateBoard, deleteBoard, joinChannel, users } = useAppContext();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const activeBoard = boards.find(b => b.id === activeBoardId);

  const toggleAssignee = (columnId: string, taskId: string, userNick: string) => {
    if (!activeBoard) return;
    const newColumns = activeBoard.columns.map(c => {
      if (c.id !== columnId) return c;
      return {
        ...c,
        tasks: c.tasks.map(t => {
          if (t.id !== taskId) return t;
          const assignees = t.assignees.includes(userNick)
            ? t.assignees.filter(a => a !== userNick)
            : [...t.assignees, userNick];
          return { ...t, assignees };
        })
      };
    });
    updateBoard({ ...activeBoard, columns: newColumns });
  };

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      createBoard(newBoardName.trim(), [
        { id: uuidv4(), title: 'To Do', tasks: [] },
        { id: uuidv4(), title: 'In Progress', tasks: [] },
        { id: uuidv4(), title: 'Done', tasks: [] }
      ]);
      setNewBoardName('');
      setIsCreatingBoard(false);
    }
  };

  const spawnRoom = (type: 'board' | 'task', id: string, name: string) => {
    const channelName = `#${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${id.substring(0, 4)}`;
    joinChannel(channelName);
    onSpawnRoom(channelName);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination || !activeBoard) return;

    const { source, destination } = result;

    if (source.droppableId === destination.droppableId) {
      // Reorder within same column
      const column = activeBoard.columns.find(c => c.id === source.droppableId);
      if (column) {
        const newTasks = Array.from(column.tasks);
        const [movedTask] = newTasks.splice(source.index, 1);
        newTasks.splice(destination.index, 0, movedTask);

        const newColumns = activeBoard.columns.map(c => 
          c.id === column.id ? { ...c, tasks: newTasks } : c
        );
        updateBoard({ ...activeBoard, columns: newColumns });
      }
    } else {
      // Move between columns
      const sourceCol = activeBoard.columns.find(c => c.id === source.droppableId);
      const destCol = activeBoard.columns.find(c => c.id === destination.droppableId);
      
      if (sourceCol && destCol) {
        const sourceTasks = Array.from(sourceCol.tasks);
        const destTasks = Array.from(destCol.tasks);
        const [movedTask] = sourceTasks.splice(source.index, 1);
        destTasks.splice(destination.index, 0, movedTask);

        const newColumns = activeBoard.columns.map(c => {
          if (c.id === sourceCol.id) return { ...c, tasks: sourceTasks };
          if (c.id === destCol.id) return { ...c, tasks: destTasks };
          return c;
        });
        updateBoard({ ...activeBoard, columns: newColumns });
      }
    }
  };

  const addTask = (columnId: string) => {
    if (!activeBoard) return;
    const title = prompt('Task title:');
    if (!title) return;

    const dueDateStr = prompt('Due date (YYYY-MM-DD) or leave empty:');
    let dueDate = null;
    if (dueDateStr) {
      const parsedDate = new Date(dueDateStr);
      if (!isNaN(parsedDate.getTime())) {
        dueDate = parsedDate.toISOString();
      }
    }

    const newTask: Task = {
      id: uuidv4(),
      title,
      description: '',
      assignees: [],
      dueDate
    };

    const newColumns = activeBoard.columns.map(c => 
      c.id === columnId ? { ...c, tasks: [...c.tasks, newTask] } : c
    );
    updateBoard({ ...activeBoard, columns: newColumns });
  };

  const addColumn = () => {
    if (!activeBoard) return;
    const title = prompt('Column title:');
    if (!title) return;

    const newColumn: Column = {
      id: uuidv4(),
      title,
      tasks: []
    };

    updateBoard({ ...activeBoard, columns: [...activeBoard.columns, newColumn] });
  };

  if (!activeBoardId || !activeBoard) {
    return (
      <div className="p-8 h-full bg-zinc-950 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">Boards</h2>
          <button 
            onClick={() => setIsCreatingBoard(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={18} />
            New Board
          </button>
        </div>

        {isCreatingBoard && (
          <div className="mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-lg font-medium mb-4 text-white">Create New Board</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Board name..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button 
                onClick={handleCreateBoard}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-md transition-colors"
              >
                Create
              </button>
              <button 
                onClick={() => setIsCreatingBoard(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-2 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map(board => (
            <div 
              key={board.id} 
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors cursor-pointer group"
              onClick={() => setActiveBoardId(board.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white group-hover:text-indigo-400 transition-colors">{board.name}</h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    spawnRoom('board', board.id, board.name);
                  }}
                  className="text-zinc-500 hover:text-indigo-400 p-1 rounded-md hover:bg-zinc-800 transition-colors"
                  title="Spawn IRC Room for Board"
                >
                  <MessageSquare size={18} />
                </button>
              </div>
              <div className="text-sm text-zinc-500">
                {board.columns.length} columns • {board.columns.reduce((acc, col) => acc + col.tasks.length, 0)} tasks
              </div>
            </div>
          ))}
          {boards.length === 0 && !isCreatingBoard && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              No boards yet. Create one to get started.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveBoardId(null)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-white">{activeBoard.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => spawnRoom('board', activeBoard.id, activeBoard.name)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md transition-colors text-sm"
          >
            <MessageSquare size={16} />
            Spawn Room
          </button>
          <button 
            onClick={() => deleteBoard(activeBoard.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-md transition-colors text-sm"
          >
            Delete Board
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full items-start">
            {activeBoard.columns.map(column => (
              <div key={column.id} className="w-80 flex-shrink-0 flex flex-col bg-zinc-900/50 rounded-xl border border-zinc-800/50 max-h-full">
                <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
                  <h3 className="font-semibold text-zinc-200">{column.title}</h3>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                    {column.tasks.length}
                  </span>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]"
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-zinc-800 border ${snapshot.isDragging ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-zinc-700/50'} rounded-lg p-4 group`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-medium text-zinc-100">{task.title}</h4>
                                <button 
                                  onClick={() => spawnRoom('task', task.id, task.title)}
                                  className="text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Spawn IRC Room for Task"
                                >
                                  <MessageSquare size={14} />
                                </button>
                              </div>
                              {task.description && (
                                <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{task.description}</p>
                              )}
                              {task.dueDate && (
                                <div className="text-[10px] text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded w-fit">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              )}
                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {task.assignees.map(assignee => (
                                    <div key={assignee} className="inline-flex h-6 w-6 rounded-full ring-2 ring-zinc-800 bg-indigo-500 items-center justify-center text-[10px] font-bold text-white" title={assignee}>
                                      {assignee.substring(0, 2).toUpperCase()}
                                    </div>
                                  ))}
                                </div>
                                <div className="relative">
                                  <button
                                    onClick={() => setAssigningTaskId(assigningTaskId === task.id ? null : task.id)}
                                    className="text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700 p-1 rounded-full transition-colors"
                                    title="Assign users"
                                  >
                                    <Users size={14} />
                                  </button>
                                  {assigningTaskId === task.id && (
                                    <div className="absolute right-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-10 py-1">
                                      <div className="px-3 py-1 text-xs font-semibold text-zinc-400 border-b border-zinc-700">Assign to...</div>
                                      {users.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-zinc-500">No users online</div>
                                      ) : (
                                        users.map(u => (
                                          <button
                                            key={u.nick}
                                            onClick={() => toggleAssignee(column.id, task.id, u.nick)}
                                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 flex items-center justify-between text-zinc-200"
                                          >
                                            <span className="truncate pr-2">{u.nick}</span>
                                            {task.assignees.includes(u.nick) && <Check size={14} className="text-emerald-500 shrink-0" />}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                
                <div className="p-3 border-t border-zinc-800/50">
                  <button 
                    onClick={() => addTask(column.id)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 py-2 rounded-md transition-colors"
                  >
                    <Plus size={16} />
                    Add Task
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              onClick={addColumn}
              className="w-80 flex-shrink-0 flex items-center justify-center gap-2 bg-zinc-900/30 border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/50 rounded-xl py-4 transition-all"
            >
              <Plus size={18} />
              Add Column
            </button>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
