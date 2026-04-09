#include <iostream>
#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <list>
#include <iomanip>
#include <sstream>
#include <algorithm>
#include <ctime>
#include <chrono>

using namespace std;

struct Date {
    int year, month, day;
    
    Date(int y = 0, int m = 0, int d = 0) : year(y), month(m), day(d) {}
    
    bool operator<(const Date& other) const {
        if (year != other.year) return year < other.year;
        if (month != other.month) return month < other.month;
        return day < other.day;
    }
    
    bool operator>(const Date& other) const {
        return other < *this;
    }
    
    string toString() const {
        char buf[11];
        sprintf(buf, "%04d-%02d-%02d", year, month, day);
        return string(buf);
    }
};

class Task {
public:
    string id, description;
    int priority;  // 1=highest, 5=lowest
    Date deadline;
    vector<string> dependencies;
    bool completed;
    
    Task(string id_, string desc_, int prio_, Date dl_, vector<string> deps = {})
        : id(id_), description(desc_), priority(prio_), deadline(dl_), completed(false) {
        dependencies = deps;
    }
    
    string toString() const {
        string status = completed ? "[Completed]" : "[Pending]";
        return status + " " + id + ": " + description + 
               " (Priority " + to_string(priority) + ", Deadline: " + deadline.toString() + ")";
    }
    
    bool operator<(const Task& other) const {
        if (priority != other.priority) return priority > other.priority;
        return id > other.id;
    }
};

class TaskScheduler {
private:
    unordered_map<string, Task> tasks;
    unordered_map<string, vector<string>> graph;
    unordered_map<string, int> indegree;
    Date currentDate;
    
    bool parseDate(const string& dateStr, Date& date) {
        int y, m, d;
        if (sscanf(dateStr.c_str(), "%d-%d-%d", &y, &m, &d) == 3) {
            date = Date(y, m, d);
            return true;
        }
        return false;
    }
    
    bool isCycleUtil(const string& node, unordered_set<string>& visited, 
                     unordered_set<string>& recStack) {
        visited.insert(node);
        recStack.insert(node);
        
        for (const string& neighbor : graph[node]) {
            if (tasks.find(neighbor) == tasks.end()) continue;
            
            if (visited.find(neighbor) == visited.end()) {
                if (isCycleUtil(neighbor, visited, recStack)) return true;
            } else if (recStack.find(neighbor) != recStack.end()) {
                return true;
            }
        }
        
        recStack.erase(node);
        return false;
    }

public:
    TaskScheduler() {
        time_t now = time(0);
        tm* ltm = localtime(&now);
        currentDate = Date(ltm->tm_year + 1900, ltm->tm_mon + 1, ltm->tm_mday);
    }
    
    bool addTask(const string& id, const string& desc, int priority, const string& deadlineStr, 
                 const vector<string>& deps) {
        Date deadline;
        if (!parseDate(deadlineStr, deadline)) {
            cout << "Error: Invalid date format! Use YYYY-MM-DD" << endl;
            return false;
        }
        
        if (tasks.find(id) != tasks.end()) {
            cout << "Error: Task " << id << " already exists!" << endl;
            return false;
        }
        
        tasks[id] = Task(id, desc, priority, deadline, deps);
        
        for (const string& dep : deps) {
            if (tasks.find(dep) == tasks.end()) {
                cout << "Warning: Dependency " << dep << " not found!" << endl;
                continue;
            }
            graph[dep].push_back(id);
        }
        
        updateIndegree(id);
        cout << "Task added: " << tasks[id].toString() << endl;
        return true;
    }
    
    void updateIndegree(const string& taskId) {
        indegree[taskId] = tasks[taskId].dependencies.size();
        for (const string& dependent : graph[taskId]) {
            if (indegree.find(dependent) != indegree.end()) {
                indegree[dependent]++;
            }
        }
    }
    
    bool removeTask(const string& id) {
        auto it = tasks.find(id);
        if (it == tasks.end()) {
            cout << "Error: Task " << id << " not found!" << endl;
            return false;
        }
        
        for (auto& pair : tasks) {
            vector<string>& deps = pair.second.dependencies;
            deps.erase(remove(deps.begin(), deps.end(), id), deps.end());
        }
        
        graph.erase(id);
        tasks.erase(id);
        indegree.erase(id);
        
        cout << "Task removed: " << id << endl;
        return true;
    }
    
    bool updateTask(const string& id, const string& field, const string& value) {
        auto it = tasks.find(id);
        if (it == tasks.end()) {
            cout << "Error: Task " << id << " not found!" << endl;
            return false;
        }
        
        Task& task = it->second;
        if (field == "description") {
            task.description = value;
        } else if (field == "priority") {
            task.priority = stoi(value);
        } else if (field == "deadline") {
            Date dl;
            if (!parseDate(value, dl)) return false;
            task.deadline = dl;
        }
        
        cout << "Task updated: " << task.toString() << endl;
        return true;
    }
    
    bool hasCycle() {
        unordered_set<string> visited, recStack;
        for (const auto& pair : tasks) {
            if (visited.find(pair.first) == visited.end()) {
                if (isCycleUtil(pair.first, visited, recStack)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    vector<string> topologicalSort() {
        queue<string> q;
        vector<string> order;
        
        for (const auto& pair : indegree) {
            if (pair.second == 0) {
                q.push(pair.first);
            }
        }
        
        while (!q.empty()) {
            string node = q.front(); q.pop();
            order.push_back(node);
            
            for (const string& neighbor : graph[node]) {
                if (indegree.find(neighbor) != indegree.end()) {
                    indegree[neighbor]--;
                    if (indegree[neighbor] == 0) {
                        q.push(neighbor);
                    }
                }
            }
        }
        
        return order.size() == tasks.size() ? order : vector<string>{};
    }
    
    vector<Task*> getReadyTasks() {
        vector<Task*> ready;
        for (auto& pair : tasks) {
            if (!pair.second.completed && indegree[pair.first] == 0) {
                ready.push_back(&pair.second);
            }
        }
        return ready;
    }
    
    Task* getNextTask() {
        vector<Task*> ready = getReadyTasks();
        if (ready.empty()) return nullptr;
        
        Task* best = &ready[0];
        for (Task* task : ready) {
            if (*task < *best) {
                best = task;
            }
        }
        return best;
    }
    
    vector<Task*> checkDeadlines() {
        vector<Task*> alerts;
        for (auto& pair : tasks) {
            if (!pair.second.completed && pair.second.deadline < currentDate) {
                alerts.push_back(&pair.second);
            }
        }
        return alerts;
    }
    
    bool completeTask(const string& id) {
        auto it = tasks.find(id);
        if (it == tasks.end() || it->second.completed) {
            cout << "Error: Task " << id << " not found or already completed!" << endl;
            return false;
        }
        
        it->second.completed = true;
        
        for (const string& dep : graph[id]) {
            if (indegree.find(dep) != indegree.end()) {
                indegree[dep]--;
            }
        }
        
        cout << "Task completed: " << it->second.toString() << endl;
        return true;
    }
    
    void showStatus() {
        cout << "\n" << string(80, '=') << endl;
        cout << "TASK SCHEDULER STATUS" << endl;
        cout << string(80, '=') << endl;
        
        vector<Task*> alerts = checkDeadlines();
        if (!alerts.empty()) {
            cout << "MISSED DEADLINES:" << endl;
            for (Task* task : alerts) {
                cout << "   " << task->toString() << endl;
            }
            cout << endl;
        }
        
        cout << "ALL TASKS:" << endl;
        vector<pair<int, string>> taskList;
        for (const auto& pair : tasks) {
            taskList.emplace_back(pair.second.priority, pair.first);
        }
        sort(taskList.begin(), taskList.end());
        
        for (const auto& p : taskList) {
            const Task& task = tasks[p.second];
            string deps = "";
            for (const string& d : task.dependencies) {
                deps += (deps.empty() ? "" : ", ") + d;
            }
            cout << "   " << task.toString() << " | Dependencies: " << (deps.empty() ? "None" : deps) << endl;
        }
        
        if (hasCycle()) {
            cout << "\nWarning: CYCLE DETECTED! Cannot schedule properly." << endl;
        }
        
        Task* next = getNextTask();
        if (next) {
            cout << "\nRECOMMENDED NEXT TASK: " << next->toString() << endl;
        } else {
            cout << "\nNo ready tasks! Complete dependencies first." << endl;
        }
        
        cout << string(80, '=') << endl << endl;
    }
    
    void setCurrentDate(int year, int month, int day) {
        currentDate = Date(year, month, day);
        cout << "Current date set to " << currentDate.toString() << endl;
    }
};

void showMenu() {
    cout << "\nTASK SCHEDULER" << endl;
    cout << "1. Add Task" << endl;
    cout << "2. Remove Task" << endl;
    cout << "3. Update Task" << endl;
    cout << "4. Complete Task" << endl;
    cout << "5. Show Status" << endl;
    cout << "6. Set Current Date (for testing)" << endl;
    cout << "7. Exit" << endl;
}

int main() {
    TaskScheduler scheduler;
    
    cout << "Welcome to Task Scheduler!" << endl;
    
    while (true) {
        showMenu();
        cout << "Choose option: ";
        string choice;
        getline(cin, choice);
        
        if (choice == "1") {
            string id, desc, deadlineStr, depsStr;
            int priority;
            
            cout << "Task ID: "; getline(cin, id);
            cout << "Description: "; getline(cin, desc);
            cout << "Priority (1-5, 1=highest): "; cin >> priority; cin.ignore();
            cout << "Deadline (YYYY-MM-DD): "; getline(cin, deadlineStr);
            cout << "Dependencies (comma-separated, Enter for none): ";
            getline(cin, depsStr);
            
            vector<string> deps;
            stringstream ss(depsStr);
            string token;
            while (getline(ss, token, ',')) {
                if (!token.empty()) deps.push_back(token);
            }
            
            scheduler.addTask(id, desc, priority, deadlineStr, deps);
            
        } else if (choice == "2") {
            string id;
            cout << "Task ID: "; getline(cin, id);
            scheduler.removeTask(id);
            
        } else if (choice == "3") {
            string id, field, value;
            cout << "Task ID: "; getline(cin, id);
            cout << "Field (description/priority/deadline): "; getline(cin, field);
            cout << "New value: "; getline(cin, value);
            scheduler.updateTask(id, field, value);
            
        } else if (choice == "4") {
            string id;
            cout << "Task ID: "; getline(cin, id);
            scheduler.completeTask(id);
            
        } else if (choice == "5") {
            scheduler.showStatus();
            
        } else if (choice == "6") {
            int y, m, d;
            cout << "Year: "; cin >> y;
            cout << "Month: "; cin >> m;
            cout << "Day: "; cin >> d; cin.ignore();
            scheduler.setCurrentDate(y, m, d);
            
        } else if (choice == "7") {
            cout << "Goodbye!" << endl;
            break;
        }
    }
    
    return 0;
}