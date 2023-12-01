import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loadForGltf = async (modelList, path) => {
    // 模型列表
    const modelMap = {}
    return new Promise((resolve) => {
        for (let i = 0; i < modelList.length; i++) {
            const item = modelList[i]
            const loader = new GLTFLoader().setPath(path)
            loader.load(`${item}.gltf`, function (gltf) {
                gltf.scene.name = item
                modelMap[item] = gltf.scene
                if (Object.keys(modelMap).length === modelList.length) {
                    resolve({ state: true, model: modelMap })
                }
            })
        }
    })
}

/**
 * @class GridBufferArea
 * @description 缓冲区
 * @param {Object} options
 * @param {Object} options.limit  容量
 * @function push(data)
 *
 *
 */
export default class GridBufferArea {
    constructor(options) {
        this.limit = options?.limit || 4
        this.data = []
        this.interval = 2 // 间距
        this.root = [] // 根模型
        this.lowestGroup = []
        this.childMeshPositionY = [] // 存储子模型的高度
        this.rows = 2 // 行数
        this.cols = 2 // 列数
        this.rowIndex = 0 // 行索引
        this.colIndex = 0 // 列索引
        this.grid = [] // 存储模型组
    }
    async loadModels() {
        const { model } = await loadForGltf(['huanchongqu'], '/models/缓冲区/')
        this.root = new THREE.Group()
        this.root.name = '缓冲区_root'
        this.root.position.setY(15)
        const mesh = model['huanchongqu']
        mesh.add(this.root)
        return mesh
    }
    async create() {
        // return this.loadModels()

        const group = new THREE.Group()
        group.name = '缓冲区_group'

        // 加载贴图
        const texture = new THREE.TextureLoader().load('/images/Texture/wg.png')

        console.log(texture)

        texture.wrapS = THREE.RepeatWrapping // 水平重复
        texture.wrapT = THREE.RepeatWrapping // 垂直重复
        texture.repeat.set(5, 5) // 重复次数

        texture.anisotropy = 16 // 最大抗锯齿
        texture.encoding = THREE.sRGBEncoding // 编码
        texture.magFilter = THREE.NearestFilter // 过滤
        texture.minFilter = THREE.NearestFilter // 过滤
        texture.needsUpdate = true // 必须更新
        texture.generateMipmaps = false // 不需要mipmap

        // 如何根据传入模型的尺寸修改贴图

        const boxGeometry = new THREE.BoxGeometry(100, 1, 100)
        // 右左 上下，后前
        const boxMaterials = [
            new THREE.MeshPhysicalMaterial({
                color: 0xe0ffff,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0ffff,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0x0086ff,
                // map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7,
                roughness: 0.5,
                metalness: 0.5,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0x000000,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0ffff,
            }),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0ffff,
            }),
        ]

        const box = new THREE.Mesh(boxGeometry, boxMaterials)
        box.name = 'box'

        box.position.setY(1)

        const createLeg = (options) => {
            const { r, legdepth, color } = options
            const legGeometry = new THREE.CylinderGeometry(r, r, legdepth, 100)
            const legMaterial = new THREE.MeshPhysicalMaterial({
                color: color || 0x0086ff,
                side: THREE.DoubleSide,
            })
            const legMesh = new THREE.Mesh(legGeometry, legMaterial)
            return legMesh
        }

        const getBoxInfo = (mesh) => {
            const info = new THREE.Box3().setFromObject(mesh)
            return {
                width: info.max.x - info.min.x,
                height: info.max.z - info.min.z,
                depth: info.max.y - info.min.y,
            }
        }

        // 计算四边的坐标
        const getLegsPos = (options) => {
            const { mesh, r, legdepth, margin } = options
            const center = mesh.position.clone()
            const { width, height } = getBoxInfo(mesh)

            return {
                leftTop: {
                    x: center.x - width / 2 + margin,
                    y: center.y + legdepth / 2,
                    z: center.z - height / 2 + margin,
                },
                leftBottom: {
                    x: center.x - width / 2 + margin,
                    y: center.y + legdepth / 2,
                    z: center.z + height / 2 - margin,
                },
                rightTop: {
                    x: center.x + width / 2 - margin,
                    y: center.y + legdepth / 2,
                    z: center.z - height / 2 + margin,
                },
                rightBottom: {
                    x: center.x + width / 2 - margin,
                    y: center.y + legdepth / 2,
                    z: center.z + height / 2 - margin,
                },
                top: {
                    x: center.x,
                    y: center.y + legdepth / 2,
                    z: center.z - height / 2 + margin,
                },
                bottom: {
                    x: center.x,
                    y: center.y + legdepth / 2,
                    z: center.z + height / 2 - margin,
                },
                left: {
                    x: center.x - width / 2 + margin,
                    y: center.y + legdepth / 2,
                    z: center.z,
                },
                right: {
                    x: center.x + width / 2 - margin,
                    y: center.y + legdepth / 2,
                    z: center.z,
                },
            }
        }

        // 创建legs 组
        const createLegs = (options) => {
            const { mesh, r, legdepth } = options
            const margin = r + 2
            const {
                leftTop,
                leftBottom,
                rightTop,
                rightBottom,
                top,
                bottom,
                left,
                right,
            } = getLegsPos({
                mesh,
                r,
                legdepth,
                margin,
            })

            const { width, height, depth } = getBoxInfo(mesh)
            const pos = [leftTop, leftBottom, rightTop, rightBottom]
            const wallPos = [top, bottom, left, right]
            const Object3D = new THREE.Object3D()

            for (let i = 0; i < 4; i++) {
                const leg = createLeg({
                    mesh,
                    r,
                    legdepth,
                    margin,
                })
                leg.name = `leg_${i}`
                leg.position.copy(pos[i])
                Object3D.add(leg)
            }

            // 创建墙体
            const wallGeometry = new THREE.BoxGeometry(
                width - 2 * margin,
                legdepth,
                r
            )
            const wallMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xb8d6d1,
                side: THREE.DoubleSide,
                // wireframe: true,
                transparent: true,
                opacity: 0.3,
            })
            const wall = new THREE.Mesh(wallGeometry, wallMaterial)
            wall.position.copy(top)

            const wall2 = wall.clone()
            wall2.position.copy(left)
            wall2.rotation.y = Math.PI / 2
            const wall3 = wall.clone()
            wall3.position.copy(right)
            wall3.rotation.y = -Math.PI / 2
            Object3D.add(wall, wall2, wall3)
            mesh.add(Object3D)
            return Object3D
        }

        createLegs({ mesh: box, r: 1, legdepth: 30 })

        const lowestGroup = new THREE.Group()
        box.add(lowestGroup)

        this.lowestGroup = lowestGroup

        this.root = box

        return box
    }

    createSphere(point) {
        const defaultPoint = point || new THREE.Vector3(0, 1, 0)
        const group = new THREE.Group()
        const sphereGeometry = new THREE.SphereGeometry(10, 32, 32)
        const sphereMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xe4393c,
        })
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
        sphere.name = 'goods_sphere'
        sphere.position.setY(10)
        group.add(sphere)
        group.type = 'sphere'
        group.position.copy(defaultPoint)
        return group
    }

    createBox(point) {
        const defaultPoint = point || new THREE.Vector3(0, 1, 0)
        const group = new THREE.Group()
        const boxGeometry = new THREE.BoxGeometry(20, 4, 20)
        const boxMaterial = new THREE.MeshPhysicalMaterial({ color: 0xd7d484 })
        const box = new THREE.Mesh(boxGeometry, boxMaterial)
        box.name = 'goods_box'
        box.position.setY(2)
        group.add(box)
        group.type = 'box'
        group.position.copy(defaultPoint)
        return group
    }

    getBoxInfo = (mesh) => {
        return new THREE.Box3().setFromObject(mesh)
    }

    getBoxInfo2 = (mesh) => {
        const info = new THREE.Box3().setFromObject(mesh)
        return {
            width: info.max.x - info.min.x,
            height: info.max.z - info.min.z,
            depth: info.max.y - info.min.y,
        }
    }

    // 放置
    placeMesh(mesh) {
        // 包围盒信息
        const meshInfo = this.getBoxInfo(mesh)
        // 传入模型的高度
        const height = Math.floor(meshInfo.max.y - meshInfo.min.y)

        if (this.lowestGroup.children.length === 0) {
            mesh.position.y = 0
        } else {
            // mesh.position.y => 上一个模型的y + height +  this.interval
            mesh.position.y =
                this.childMeshPositionY.at(-1).y +
                this.childMeshPositionY.at(-1).height +
                this.interval
        }
        // 记录每一个子模型的位置信息，自身高度
        this.childMeshPositionY.push({
            uuid: mesh.uuid,
            y: mesh.position.y,
            height,
        })
        this.lowestGroup.add(mesh)
        return this.lowestGroup
    }

    initGrid() {
        for (let i = 0; i < this.rows; i++) {
            this.grid[i] = []
            for (let j = 0; j < this.cols; j++) {
                this.grid[i][j] = {}
            }
        }
        // console.log(rowWidth, colWidth, this.grid)
    }

    getCenterPos(rowIndex, colIndex) {
        const rowWidth = this.getBoxInfo2(this.root).width / this.rows
        const colWidth = this.getBoxInfo2(this.root).height / this.cols
        const rootMeshCenterPos = this.root.position.clone()
        // console.log('原点', rootMeshCenterPos)
        // console.log(rowWidth, colWidth)

        return {
            x:
                rootMeshCenterPos.x -
                (this.rows / 2) * rowWidth +
                rowWidth / 2 +
                this.rowIndex * rowWidth,
            y: 10,
            z:
                rootMeshCenterPos.z -
                (this.cols / 2) * colWidth +
                colWidth / 2 +
                this.colIndex * colWidth,
        }
    }

    // 排列的行列
    placeMesh2(mesh) {
        // 格子总量小于等于容量
        if (this.rowIndex * this.colIndex < this.rows * this.cols) {
            // 当前的列索引小于最大的列数时
            if (this.rowIndex < this.rows) {
                if (this.colIndex < this.cols - 1) {
                    const curMeshCenterPos = this.getCenterPos(
                        this.rowIndex,
                        this.colIndex
                    )

                    // 设置到对应的中心点
                    mesh.position.copy(curMeshCenterPos)
                    // 添加到二维数组中
                    this.grid[this.rowIndex][this.colIndex] = {
                        uuid: mesh.uuid,
                        mesh,
                        centerPos: curMeshCenterPos,
                    }
                    this.colIndex++
                } else if (this.colIndex === this.cols - 1) {
                    const curMeshCenterPos = this.getCenterPos(
                        this.rowIndex,
                        this.colIndex
                    )

                    // 设置到对应的中心点
                    mesh.position.copy(curMeshCenterPos)
                    // 添加到二维数组中
                    this.grid[this.rowIndex][this.colIndex] = {
                        uuid: mesh.uuid,
                        mesh,
                        centerPos: curMeshCenterPos,
                    }
                    this.colIndex = 0
                    this.rowIndex++
                }
            } else {
                this.colIndex = 0
            }

            this.lowestGroup.add(mesh)
            return this.lowestGroup
        }
    }

    // 更新子模型的位置
    updatePos(height) {
        this.lowestGroup.children.forEach((cube, index) => {
            if (index > 0) {
                const curIndex = this.childMeshPositionY.findIndex(
                    (item) => item.uuid === cube.uuid
                )
                if (curIndex > 0) {
                    const meshY = this.childMeshPositionY[curIndex].y
                    cube.position.y = meshY - height - this.interval
                    this.childMeshPositionY[curIndex].y = cube.position.y
                }
            }
        })
    }

    // 添加
    addBufferArea(mesh) {
        if (this.data.length >= this.limit) {
        } else {
            this.data.push(mesh)
            // this.placeMesh(mesh)
            this.placeMesh2(mesh)
        }
    }
    get() {
        return this.data
    }
    clear() {
        this.data = []
    }

    // 移除模型时，触发的更新
    removeBufferArea(mesh) {
        const index = this.data.findIndex((item) => item.uuid === mesh.uuid)
        if (index > -1) {
            const curHeight = this.childMeshPositionY.at(index).height

            this.data.splice(index, 1)
            this.childMeshPositionY.splice(index, 1)
            this.lowestGroup.remove(mesh)
        }
        return mesh
    }

    getBuffer() {
        if (this.data.length > 0) {
            return this.data.at(-1)
        } else {
            return null
        }
    }
}
