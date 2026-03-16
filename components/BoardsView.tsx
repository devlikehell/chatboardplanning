'use client';

import { useState, useRef } from 'react';
import { Plus, MessageSquare, Settings, X, GripVertical, Users, Check, Calendar as CalendarIcon, AlignLeft, Type, Bold, Italic, List, ListOrdered, Link as LinkIcon, AlertCircle, CheckSquare, MessageCircle, Tag as TagIcon, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppContext, Board, Column, Task, Priority, ChecklistItem, Comment, Tag } from '@/lib/store';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';

export function BoardsView({ onSpawnRoom }: { onSpawnRoom: (room: string) => void }) {
  const { boards, createBoard, updateBoard, deleteBoard, joinChannel, users, nick } = useAppContext();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string, 
    description: string, 
    dueDate: string, 
    linkedTaskIds: string[],
    priority?: Priority,
    checklist: ChecklistItem[],
    comments: Comment[],
    tagIds: string[],
    subtaskIds: string[],
    parentTaskId?: string
  }>({ 
    title: '', description: '', dueDate: '', linkedTaskIds: [], checklist: [], comments: [], tagIds: [], subtaskIds: [] 
  });
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const [showSubtaskDropdown, setShowSubtaskDropdown] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newChecklistItemText, setNewChecklistItemText] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = taskForm.description;
    const selectedText = text.substring(start, end);

    let newText = '';
    let newCursorPos = 0;

    if (prefix === '- ' || prefix === '1. ') {
      if (selectedText) {
        const lines = selectedText.split('\n');
        const prefixedLines = lines.map((line, i) => prefix === '1. ' ? `${i + 1}. ${line}` : `${prefix}${line}`);
        const replacement = prefixedLines.join('\n');
        newText = text.substring(0, start) + replacement + text.substring(end);
        newCursorPos = start + replacement.length;
      } else {
        newText = text.substring(0, start) + prefix + text.substring(end);
        newCursorPos = start + prefix.length;
      }
    } else {
      newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      newCursorPos = start + prefix.length + selectedText.length;
    }

    setTaskForm({ ...taskForm, description: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

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

  const openNewTaskModal = (columnId: string) => {
    setEditingColumnId(columnId);
    setEditingTask(null);
    setTaskForm({ 
      title: '', description: '', dueDate: '', linkedTaskIds: [], 
      checklist: [], comments: [], tagIds: [], subtaskIds: [] 
    });
    setIsTaskModalOpen(true);
    setShowLinkDropdown(false);
    setShowSubtaskDropdown(false);
    setNewCommentText('');
    setNewChecklistItemText('');
  };

  const openEditTaskModal = (columnId: string, task: Task) => {
    setEditingColumnId(columnId);
    setEditingTask(task);
    setTaskForm({ 
      title: task.title, 
      description: task.description || '', 
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      linkedTaskIds: task.linkedTaskIds || [],
      priority: task.priority,
      checklist: task.checklist || [],
      comments: task.comments || [],
      tagIds: task.tagIds || [],
      subtaskIds: task.subtaskIds || [],
      parentTaskId: task.parentTaskId
    });
    setIsTaskModalOpen(true);
    setShowLinkDropdown(false);
    setShowSubtaskDropdown(false);
    setNewCommentText('');
    setNewChecklistItemText('');
  };

  const saveTask = (closeModal = true) => {
    if (!activeBoard || !editingColumnId || !taskForm.title.trim()) return;

    let dueDate = null;
    if (taskForm.dueDate) {
      const parsedDate = new Date(taskForm.dueDate);
      if (!isNaN(parsedDate.getTime())) {
        dueDate = parsedDate.toISOString();
      }
    }

    if (editingTask) {
      // Update existing task
      const newColumns = activeBoard.columns.map(c => {
        if (c.id !== editingColumnId) return c;
        return {
          ...c,
          tasks: c.tasks.map(t => t.id === editingTask.id ? { 
            ...t, 
            title: taskForm.title, 
            description: taskForm.description, 
            dueDate, 
            linkedTaskIds: taskForm.linkedTaskIds,
            priority: taskForm.priority,
            checklist: taskForm.checklist,
            comments: taskForm.comments,
            tagIds: taskForm.tagIds,
            subtaskIds: taskForm.subtaskIds,
            parentTaskId: taskForm.parentTaskId
          } : t)
        };
      });
      updateBoard({ ...activeBoard, columns: newColumns });
    } else {
      // Create new task
      const newTask: Task = {
        id: uuidv4(),
        title: taskForm.title,
        description: taskForm.description,
        assignees: [],
        dueDate,
        linkedTaskIds: taskForm.linkedTaskIds,
        priority: taskForm.priority,
        checklist: taskForm.checklist,
        comments: taskForm.comments,
        tagIds: taskForm.tagIds,
        subtaskIds: taskForm.subtaskIds,
        parentTaskId: taskForm.parentTaskId
      };
      const newColumns = activeBoard.columns.map(c => 
        c.id === editingColumnId ? { ...c, tasks: [...c.tasks, newTask] } : c
      );
      updateBoard({ ...activeBoard, columns: newColumns });
    }

    if (closeModal) setIsTaskModalOpen(false);
  };

  const handleSwitchTask = (targetColumnId: string, targetTask: Task) => {
    saveTask(false);
    openEditTaskModal(targetColumnId, targetTask);
  };

  const deleteTask = () => {
    if (!activeBoard || !editingColumnId || !editingTask) return;
    
    const newColumns = activeBoard.columns.map(c => {
      if (c.id !== editingColumnId) return c;
      return {
        ...c,
        tasks: c.tasks.filter(t => t.id !== editingTask.id)
      };
    });
    updateBoard({ ...activeBoard, columns: newColumns });
    setIsTaskModalOpen(false);
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
          {activeBoard.tags && activeBoard.tags.length > 0 && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-zinc-800">
              <span className="text-sm text-zinc-500">Filter:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedTagId(null)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${selectedTagId === null ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  All
                </button>
                {activeBoard.tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id === selectedTagId ? null : tag.id)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors`}
                    style={{ 
                      backgroundColor: selectedTagId === tag.id ? tag.color : `${tag.color}20`, 
                      color: selectedTagId === tag.id ? '#fff' : tag.color,
                      border: `1px solid ${tag.color}50`
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                    {column.tasks.filter(task => selectedTagId === null || (task.tagIds && task.tagIds.includes(selectedTagId))).length}
                  </span>
                </div>
                
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]"
                    >
                      {column.tasks.filter(task => selectedTagId === null || (task.tagIds && task.tagIds.includes(selectedTagId))).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={selectedTagId !== null}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-zinc-800 border ${snapshot.isDragging ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-zinc-700/50'} rounded-lg p-4 group`}
                            >
                              {task.tagIds && task.tagIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {task.tagIds.map(tagId => {
                                    const tag = activeBoard.tags?.find(t => t.id === tagId);
                                    if (!tag) return null;
                                    return (
                                      <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}50` }}>
                                        {tag.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="flex justify-between items-start mb-2">
                                <h4 
                                  className="text-sm font-medium text-zinc-100 cursor-pointer hover:text-indigo-400 transition-colors flex items-center gap-2"
                                  onClick={() => openEditTaskModal(column.id, task)}
                                >
                                  {task.priority && (
                                    <span className={`w-2 h-2 rounded-full ${
                                      task.priority === 'High' ? 'bg-red-500' :
                                      task.priority === 'Medium' ? 'bg-yellow-500' :
                                      'bg-blue-500'
                                    }`} title={`${task.priority} Priority`} />
                                  )}
                                  {task.title}
                                </h4>
                                <button 
                                  onClick={() => spawnRoom('task', task.id, task.title)}
                                  className="text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Spawn IRC Room for Task"
                                >
                                  <MessageSquare size={14} />
                                </button>
                              </div>
                              {task.description && (
                                <p 
                                  className="text-xs text-zinc-400 line-clamp-2 mb-2 cursor-pointer hover:text-zinc-300"
                                  onClick={() => openEditTaskModal(column.id, task)}
                                >
                                  {task.description}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                {task.dueDate && (
                                  <div className="text-[10px] text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded flex items-center gap-1">
                                    <CalendarIcon size={10} />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </div>
                                )}
                                {task.checklist && task.checklist.length > 0 && (
                                  <div className="text-[10px] text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded flex items-center gap-1" title="Checklist">
                                    <CheckSquare size={10} />
                                    {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                                  </div>
                                )}
                                {task.subtaskIds && task.subtaskIds.length > 0 && (
                                  <div className="text-[10px] text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded flex items-center gap-1" title="Subtasks">
                                    <List size={10} />
                                    {task.subtaskIds.length}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {task.assignees.map(assignee => (
                                    <div key={assignee} className="inline-flex h-6 w-6 rounded-full ring-2 ring-zinc-800 bg-indigo-500 items-center justify-center text-[10px] font-bold text-white" title={assignee}>
                                      {assignee.substring(0, 2).toUpperCase()}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  {task.comments && task.comments.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-zinc-500" title="Comments">
                                      <MessageCircle size={12} />
                                      {task.comments.length}
                                    </div>
                                  )}
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
                    onClick={() => openNewTaskModal(column.id)}
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

      {/* Task Modal */}
      {isTaskModalOpen && (() => {
        const allTasks = activeBoard ? activeBoard.columns.flatMap(c => c.tasks.map(t => ({...t, columnId: c.id}))) : [];
        const availableTasksToLink = allTasks.filter(t => t.id !== editingTask?.id && !taskForm.linkedTaskIds.includes(t.id));
        const linkedTasks = taskForm.linkedTaskIds.map(id => allTasks.find(t => t.id === id)).filter(Boolean) as (Task & {columnId: string})[];

        return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button 
                onClick={() => setIsTaskModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <Type size={16} /> Title
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                    <AlignLeft size={16} /> Description
                  </label>
                  <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-md p-1">
                    <button
                      type="button"
                      onClick={() => insertMarkdown('**', '**')}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('*', '*')}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertMarkdown('- ')}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                      title="Bullet List"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('1. ')}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                      title="Numbered List"
                    >
                      <ListOrdered size={14} />
                    </button>
                  </div>
                </div>
                <textarea
                  ref={descriptionRef}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add a more detailed description..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[120px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <CalendarIcon size={16} /> Due Date
                </label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [color-scheme:dark]"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <AlertCircle size={16} /> Priority
                </label>
                <div className="flex gap-2">
                  {(['Low', 'Medium', 'High'] as Priority[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setTaskForm({ ...taskForm, priority: p })}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        taskForm.priority === p 
                          ? p === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                            : p === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-zinc-900/50 text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {taskForm.priority && (
                    <button
                      onClick={() => setTaskForm({ ...taskForm, priority: undefined })}
                      className="px-2 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Clear priority"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <TagIcon size={16} /> Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {taskForm.tagIds.map(tagId => {
                    const tag = activeBoard.tags?.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <div key={tag.id} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}50` }}>
                        {tag.name}
                        <button onClick={() => setTaskForm(prev => ({...prev, tagIds: prev.tagIds.filter(id => id !== tag.id)}))} className="hover:opacity-70 ml-1">
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => {
                      const name = prompt('New tag name:');
                      if (!name) return;
                      const color = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'][Math.floor(Math.random() * 8)];
                      const newTag = { id: uuidv4(), name, color };
                      updateBoard({ ...activeBoard, tags: [...(activeBoard.tags || []), newTag] });
                      setTaskForm(prev => ({...prev, tagIds: [...prev.tagIds, newTag.id]}));
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-900/50 border border-dashed border-zinc-700 px-2 py-1 rounded-md transition-colors"
                  >
                    <Plus size={12} /> New Tag
                  </button>
                  {activeBoard.tags && activeBoard.tags.filter(t => !taskForm.tagIds.includes(t.id)).length > 0 && (
                    <div className="relative group">
                      <button className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-900/50 border border-dashed border-zinc-700 px-2 py-1 rounded-md transition-colors">
                        <Plus size={12} /> Existing Tag
                      </button>
                      <div className="absolute left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-20 hidden group-hover:block py-1">
                        {activeBoard.tags.filter(t => !taskForm.tagIds.includes(t.id)).map(t => (
                          <button
                            key={t.id}
                            onClick={() => setTaskForm(prev => ({...prev, tagIds: [...prev.tagIds, t.id]}))}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 flex items-center gap-2"
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                            <span className="text-zinc-200">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                    <CheckSquare size={16} /> Checklist
                  </label>
                  {taskForm.checklist.length > 0 && (
                    <span className="text-xs text-zinc-500">
                      {taskForm.checklist.filter(i => i.completed).length} / {taskForm.checklist.length} ({Math.round(taskForm.checklist.filter(i => i.completed).length / taskForm.checklist.length * 100)}%)
                    </span>
                  )}
                </div>
                
                {taskForm.checklist.length > 0 && (
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-3">
                    <div 
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.round(taskForm.checklist.filter(i => i.completed).length / taskForm.checklist.length * 100)}%` }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {taskForm.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => setTaskForm(prev => ({
                          ...prev, 
                          checklist: prev.checklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i)
                        }))}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-600 hover:border-zinc-400 text-transparent'}`}
                      >
                        <Check size={14} />
                      </button>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => setTaskForm(prev => ({
                          ...prev,
                          checklist: prev.checklist.map(i => i.id === item.id ? { ...i, text: e.target.value } : i)
                        }))}
                        className={`flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm ${item.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
                      />
                      <button
                        onClick={() => setTaskForm(prev => ({
                          ...prev,
                          checklist: prev.checklist.filter(i => i.id !== item.id)
                        }))}
                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-5 h-5 rounded border border-zinc-700 flex items-center justify-center text-zinc-700">
                      <Plus size={14} />
                    </div>
                    <input
                      type="text"
                      value={newChecklistItemText}
                      onChange={(e) => setNewChecklistItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newChecklistItemText.trim()) {
                          setTaskForm(prev => ({
                            ...prev,
                            checklist: [...prev.checklist, { id: uuidv4(), text: newChecklistItemText.trim(), completed: false }]
                          }));
                          setNewChecklistItemText('');
                        }
                      }}
                      placeholder="Add an item..."
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-zinc-200 placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <List size={16} /> Subtasks
                </label>
                <div className="flex flex-col gap-2">
                  {taskForm.subtaskIds.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {taskForm.subtaskIds.map(id => {
                        const t = allTasks.find(task => task.id === id);
                        if (!t) return null;
                        return (
                          <div key={t.id} className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-md p-2 text-sm group">
                            <button 
                              onClick={() => handleSwitchTask(t.columnId, t)}
                              className="text-zinc-300 hover:text-indigo-400 hover:underline truncate flex-1 text-left"
                            >
                              {t.title}
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                                {activeBoard.columns.find(c => c.id === t.columnId)?.title}
                              </span>
                              <button 
                                onClick={() => setTaskForm(prev => ({...prev, subtaskIds: prev.subtaskIds.filter(subId => subId !== t.id)}))}
                                className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowSubtaskDropdown(!showSubtaskDropdown)}
                      className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-900/50 border border-dashed border-zinc-700 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Plus size={14} /> Add Subtask
                    </button>
                    
                    {showSubtaskDropdown && (
                      <div className="absolute left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto py-1">
                        {availableTasksToLink.filter(t => !taskForm.subtaskIds.includes(t.id)).length === 0 ? (
                          <div className="px-3 py-2 text-xs text-zinc-500">No other tasks available</div>
                        ) : (
                          availableTasksToLink.filter(t => !taskForm.subtaskIds.includes(t.id)).map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setTaskForm(prev => ({...prev, subtaskIds: [...prev.subtaskIds, t.id]}));
                                setShowSubtaskDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 text-zinc-200 truncate"
                            >
                              {t.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <LinkIcon size={16} /> Linked Tasks
                </label>
                <div className="flex flex-col gap-2">
                  {linkedTasks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {linkedTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm">
                          <button 
                            onClick={() => handleSwitchTask(t.columnId, t)}
                            className="text-indigo-400 hover:text-indigo-300 hover:underline truncate max-w-[200px]"
                          >
                            {t.title}
                          </button>
                          <button 
                            onClick={() => setTaskForm(prev => ({...prev, linkedTaskIds: prev.linkedTaskIds.filter(id => id !== t.id)}))}
                            className="text-zinc-500 hover:text-red-400 ml-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowLinkDropdown(!showLinkDropdown)}
                      className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-900/50 border border-dashed border-zinc-700 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Plus size={14} /> Add Link
                    </button>
                    
                    {showLinkDropdown && (
                      <div className="absolute left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto py-1">
                        {availableTasksToLink.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-zinc-500">No other tasks available</div>
                        ) : (
                          availableTasksToLink.map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setTaskForm(prev => ({...prev, linkedTaskIds: [...prev.linkedTaskIds, t.id]}));
                                setShowLinkDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 text-zinc-200 truncate"
                            >
                              {t.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  <MessageCircle size={16} /> Comments
                </label>
                
                {taskForm.comments.length > 0 ? (
                  <div className="space-y-3">
                    {taskForm.comments.map(comment => (
                      <div key={comment.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-indigo-400">{comment.author}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(comment.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500 italic">No comments yet.</div>
                )}

                <div className="flex flex-col gap-2">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[80px] resize-y"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (newCommentText.trim()) {
                          setTaskForm(prev => ({
                            ...prev,
                            comments: [...prev.comments, {
                              id: uuidv4(),
                              author: nick || 'Anonymous',
                              text: newCommentText.trim(),
                              timestamp: Date.now()
                            }]
                          }));
                          setNewCommentText('');
                        }
                      }}
                      disabled={!newCommentText.trim()}
                      className="bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-600 text-zinc-200 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-b-xl">
              {editingTask ? (
                <button 
                  onClick={deleteTask}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-md transition-colors text-sm font-medium"
                >
                  Delete Task
                </button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsTaskModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-2 rounded-md transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => saveTask(true)}
                  disabled={!taskForm.title.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:text-white/50 text-white px-5 py-2 rounded-md transition-colors text-sm font-medium"
                >
                  Save Task
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
