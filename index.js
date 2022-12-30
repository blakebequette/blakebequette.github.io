const projectList = [
    {
        projectName: "A",
        description: "A first project",
        thumbnail: "./projects/projA/A.jpg",
        entry: "./projects/projA/index.html"
    },
    {
        projectName: "B",
        description: "Another project",
        thumbnail: "./projects/projB/B.jpg",
        entry: "./projects/projB/index.html"
    },
    {
        projectName: "A",
        description: "A first project",
        thumbnail: "./projects/projA/A.jpg",
        entry: "./projects/projA/index.html"
    },
    {
        projectName: "B",
        description: "Another project",
        thumbnail: "./projects/projB/B.jpg",
        entry: "./projects/projB/index.html"
    },
    {
        projectName: "A",
        description: "A first project",
        thumbnail: "./projects/projA/A.jpg",
        entry: "./projects/projA/index.html"
    },
    {
        projectName: "B",
        description: "Another project",
        thumbnail: "./projects/projB/B.jpg",
        entry: "./projects/projB/index.html"
    }
]

const insertionNode = document.getElementById("tile-insertion-point")

function project2TileNode(project){
    let newTile = document.createElement("div")
    newTile.innerText = project.projectName
    newTile.className = "tile flxd"
    newTile.innerHTML = `<h4 class="project-title">&#20${project.projectName}</h4>
        <p class="project-description">${project.description}</p>
        <img src='${project.thumbnail}' alt='' class='thumbnail' />`
    return newTile
}

projectList.map(project => {
    let newTile = project2TileNode(project)
    insertionNode.appendChild(newTile)
})