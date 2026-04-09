
#include <bits/stdc++.h>
using namespace std;

// Priority Queue
void pqDemo(){
    priority_queue<int, vector<int>, greater<int>> pq;
    pq.push(3); pq.push(1); pq.push(2);
    while(!pq.empty()){
        cout << pq.top() << " ";
        pq.pop();
    }
}

// Graph + Cycle + Topo
unordered_map<int, vector<int>> g;

bool dfsCycle(int v, unordered_set<int>&vis, unordered_set<int>&rec){
    if(rec.count(v)) return true;
    if(vis.count(v)) return false;

    vis.insert(v);
    rec.insert(v);

    for(int n : g[v]){
        if(dfsCycle(n,vis,rec)) return true;
    }

    rec.erase(v);
    return false;
}

void topoDFS(int v, unordered_set<int>&vis, stack<int>&st){
    vis.insert(v);
    for(int n:g[v])
        if(!vis.count(n))
            topoDFS(n,vis,st);
    st.push(v);
}

int main(){
    pqDemo();
    cout << endl;

    g[1]={2};
    g[2]={3};

    unordered_set<int> vis, rec;
    cout << "Cycle: " << dfsCycle(1,vis,rec) << endl;

    stack<int> st;
    vis.clear();
    for(auto &p:g)
        if(!vis.count(p.first))
            topoDFS(p.first,vis,st);

    cout << "Topo: ";
    while(!st.empty()){
        cout << st.top() << " ";
        st.pop();
    }
}
