<div align="center">

# 🖥️ Operating Systems for Dummies

### Learn operating systems by *watching them work.*

A free, open 16-week undergraduate course where every idea gets an analogy, a precise definition,<br>
a worked trace, runnable code, and an interactive model you can poke at.

<br>

[![Open the Course](https://img.shields.io/badge/▶%20Open%20the%20Course-Live%20Site-2ea44f?style=for-the-badge&logo=githubpages&logoColor=white)](https://engrfayyazhussainsahito.github.io/Operating-System/index.html)
[![Syllabus](https://img.shields.io/badge/📚%20View-Syllabus-0969da?style=for-the-badge)](https://engrfayyazhussainsahito.github.io/Operating-System/syllabus.html)
[![Glossary](https://img.shields.io/badge/🔎%20Browse-Glossary-8250df?style=for-the-badge)](https://engrfayyazhussainsahito.github.io/Operating-System/glossary.html)

![Weeks](https://img.shields.io/badge/weeks-16-blue?style=flat-square)
![Interactive Models](https://img.shields.io/badge/interactive%20models-27-orange?style=flat-square)
![Figures](https://img.shields.io/badge/figures-68-teal?style=flat-square)
![Exercises](https://img.shields.io/badge/exercises-139-red?style=flat-square)
![Cost](https://img.shields.io/badge/cost-free-brightgreen?style=flat-square)
![Text License](https://img.shields.io/badge/text-CC%20BY%204.0-lightgrey?style=flat-square)
![Code License](https://img.shields.io/badge/code-MIT-yellow?style=flat-square)

</div>

---

## 📖 Table of Contents

- [Why This Course](#-why-this-course)
- [Learning Path](#-learning-path)
- [Topics Covered](#-topics-covered)
- [How to Study](#-how-to-study)
- [Who Is This For](#-who-is-this-for)
- [Run Locally](#-run-locally)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Why This Course

Most OS material either drowns you in theory or skips the "why". This course is built around one rule: **you should see the idea before you memorize it.**

| | Every week includes |
|---|---|
| 💡 | **An analogy**: an everyday picture of the concept |
| 📐 | **A precise definition**: the exam-ready version |
| ✍️ | **A worked trace**: Gantt charts, page tables and Banker's matrices solved step by step |
| 💻 | **Runnable C code**: labs need only `gcc` on Linux or WSL |
| 🎛️ | **An interactive model**: a simulator or 3D model you can change and break |
| ✅ | **Exercises with worked solutions**: 139 in total, every one solved |

> 🔒 **Private by design.** Your progress is saved in your browser only. No account, no tracking.

---

## 🗺️ Learning Path

Four phases, sixteen weeks, one coherent story from "what is an OS?" to "how do containers work?".

### Phase 1 · Foundations

| Week | Topic | What you'll learn |
|:---:|---|---|
| [01](https://engrfayyazhussainsahito.github.io/Operating-System/week-01.html) | **Introduction, OS Structure and System Calls** | Hardware protection, system calls, kernel organization, booting |
| [02](https://engrfayyazhussainsahito.github.io/Operating-System/week-02.html) | **Processes** | PCB, process states, context switching, `fork` / `exec` / `wait` |
| [03](https://engrfayyazhussainsahito.github.io/Operating-System/week-03.html) | **Threads and IPC** | POSIX threads, speedup limits, pipes, shared memory, signals |
| [04](https://engrfayyazhussainsahito.github.io/Operating-System/week-04.html) | **CPU Scheduling** | FCFS, SJF, Round Robin, MLFQ, Linux fair scheduler, real-time policies |

### Phase 2 · Concurrency and Deadlocks

| Week | Topic | What you'll learn |
|:---:|---|---|
| [05](https://engrfayyazhussainsahito.github.io/Operating-System/week-05.html) | **Synchronization I** | Race conditions, critical sections, atomics, spinlocks, mutexes, semaphores |
| [06](https://engrfayyazhussainsahito.github.io/Operating-System/week-06.html) | **Synchronization II** | Bounded buffer, readers-writers, dining philosophers, monitors |
| [07](https://engrfayyazhussainsahito.github.io/Operating-System/week-07.html) | **Deadlocks** | Four conditions, resource-allocation graphs, Banker's algorithm, recovery |

### Phase 3 · Memory

| Week | Topic | What you'll learn |
|:---:|---|---|
| [08](https://engrfayyazhussainsahito.github.io/Operating-System/week-08.html) | **Main Memory** | Paging, TLBs, multilevel page tables, segmentation, address translation |
| [09](https://engrfayyazhussainsahito.github.io/Operating-System/week-09.html) | **Virtual Memory** | Demand paging, copy-on-write, kernel and `malloc` allocation |
| [10](https://engrfayyazhussainsahito.github.io/Operating-System/week-10.html) | **Page Replacement and Thrashing** | FIFO, LRU, OPT, Clock, Belady's anomaly, frame allocation |

### Phase 4 · Storage, Protection and Modern Systems

| Week | Topic | What you'll learn |
|:---:|---|---|
| [11](https://engrfayyazhussainsahito.github.io/Operating-System/week-11.html) | **Mass Storage** | HDDs, SSDs, FCFS / SSTF / SCAN / LOOK, RAID |
| [12](https://engrfayyazhussainsahito.github.io/Operating-System/week-12.html) | **File Systems I** | Files, directories, FAT, indexed allocation, inodes, links, VFS |
| [13](https://engrfayyazhussainsahito.github.io/Operating-System/week-13.html) | **File Systems II and I/O** | Journaling, copy-on-write, caching, polling, interrupts, DMA, drivers |
| [14](https://engrfayyazhussainsahito.github.io/Operating-System/week-14.html) | **Protection and Security** | Rings, access matrix, ACLs, capabilities, setuid, seccomp, TOCTOU |
| [15](https://engrfayyazhussainsahito.github.io/Operating-System/week-15.html) | **Virtualization, Containers, Case Studies** | Hypervisors, namespaces, cgroups, Linux and Windows internals |
| [16](https://engrfayyazhussainsahito.github.io/Operating-System/week-16.html) | **Review, Projects and Final Exam** | Cheat sheet, debugging checklist, final project, 28-question practice final |

---

## 🧠 Topics Covered

<table>
<tr>
<td width="33%" valign="top">

**⚙️ Foundations**
- System calls
- Kernel structure
- Dual-mode operation
- Booting
- Processes and threads
- IPC

</td>
<td width="33%" valign="top">

**🔄 Concurrency**
- CPU scheduling
- Race conditions
- Mutexes and semaphores
- Monitors
- Classic sync problems
- Deadlock handling

</td>
<td width="33%" valign="top">

**🧩 Memory**
- Paging and TLBs
- Segmentation
- Virtual memory
- Copy-on-write
- Page replacement
- Thrashing

</td>
</tr>
<tr>
<td width="33%" valign="top">

**💾 Storage**
- HDDs and SSDs
- Disk scheduling
- RAID
- Inodes and FAT
- Journaling
- Caching

</td>
<td width="33%" valign="top">

**🔐 Security**
- Protection rings
- Access matrix
- ACLs and capabilities
- Unix permissions
- Least privilege
- Memory-safety defenses

</td>
<td width="33%" valign="top">

**☁️ Modern Systems**
- Hypervisors
- Containers
- Namespaces and cgroups
- Linux case study
- Windows case study
- I/O subsystem

</td>
</tr>
</table>

---

## 🎯 How to Study

1. **Predict, then press.** Every demo has a question ahead of it. Write your answer first, then run it.
2. **Trace on paper.** Gantt charts, page tables and Banker matrices are exam skills. Work the exercise by hand, then open the solution.
3. **Run the code.** Labs need only `gcc` on Linux or WSL. Change a line, break it on purpose, read the error.
4. **Look things up.** Search with the `/` key. Every glossary term links to the week that defines it.

---

## 👥 Who Is This For

| Audience | How it helps |
|---|---|
| 🎓 **Undergraduate students** | A companion to your OS lectures with worked solutions |
| 🧑‍💻 **Self-taught developers** | Fills in the systems knowledge behind everyday tools |
| 🧑‍🏫 **Instructors** | Open, reusable material under CC BY 4.0 |
| 💼 **Interview candidates** | Clear refreshers on scheduling, memory, concurrency and file systems |

---

## 🚀 Run Locally

```bash
# Clone the repository
git clone https://github.com/engrfayyazhussainsahito/Operating-System.git
cd Operating-System

# Serve it locally
python -m http.server 8000
```

Then open **http://localhost:8000** in your browser. You can also open `index.html` directly.

---

## 🤝 Contributing

Contributions are welcome: typo fixes, clearer explanations, new exercises, or better visualizations.

1. Fork the repository
2. Create a branch: `git checkout -b improve-week-05`
3. Commit your changes: `git commit -m "Clarify semaphore example"`
4. Push the branch: `git push origin improve-week-05`
5. Open a Pull Request

See also the [About and Contributing](https://engrfayyazhussainsahito.github.io/Operating-System/about.html) page. Found a mistake? [Open an issue](https://github.com/engrfayyazhussainsahito/Operating-System/issues).

---

## 📄 License

| Content | License |
|---|---|
| Text and figures | [Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Source code | [MIT](https://opensource.org/licenses/MIT) |

---

<div align="center">

**Built by [@engrfayyazhussainsahito](https://github.com/engrfayyazhussainsahito)**

If this course helped you, a ⭐ on the repo means a lot.

[**▶ Start with Week 1**](https://engrfayyazhussainsahito.github.io/Operating-System/week-01.html)

</div>
